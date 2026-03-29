export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Sentinel Report] [Vercel Edge]', JSON.stringify(body));
      return new Response(JSON.stringify({ status: "received", platform: "vercel-edge" }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
