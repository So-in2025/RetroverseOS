export const config = {
  runtime: 'edge',
};

export default function handler(req: Request) {
  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString(), platform: "vercel-edge" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
