const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

    const prompt = `Analise esta imagem e extraia todos os contatos/leads visíveis.
Pode ser uma lista do WhatsApp, grupos, print de planilha, perfil do Instagram, lista de empresas, etc.

Retorne APENAS um JSON válido, sem markdown, sem explicações:

{
  "leads": [
    {
      "nome": "nome completo ou nome da empresa",
      "whatsapp": "número com DDI (ex: 5511999999999) ou vazio",
      "telefone": "número alternativo ou vazio",
      "email": "email ou vazio",
      "instagram": "@handle ou vazio",
      "atividade": "segmento/atividade da empresa ou vazio",
      "cidade": "cidade ou vazio",
      "estado": "UF ou vazio",
      "cnpj": "CNPJ apenas dígitos ou vazio",
      "razao_social": "razão social se diferente do nome ou vazio",
      "decisor": "nome do decisor/responsável se visível ou vazio"
    }
  ]
}

Regras:
- Extraia TODOS os contatos visíveis na imagem, um por linha/card
- Telefones: remova toda formatação, apenas dígitos, com DDI 55 se brasileiro
- Se não encontrar um campo, use string vazia ""
- Nome é obrigatório — se não encontrar nome, use o número de telefone como nome
- Mínimo: 1 contato. Máximo: sem limite`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType || 'image/png', data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errBody}`);
    }

    const result = await res.json();
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{"leads":[]}';
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(text);

    // Normaliza telefones para apenas dígitos
    (parsed.leads || []).forEach((l: any) => {
      if (l.whatsapp) l.whatsapp = String(l.whatsapp).replace(/\D/g, '');
      if (l.telefone) l.telefone = String(l.telefone).replace(/\D/g, '');
      if (l.cnpj)     l.cnpj     = String(l.cnpj).replace(/\D/g, '');
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro ao extrair leads da imagem:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
