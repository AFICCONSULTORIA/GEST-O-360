interface HealthResponse {
  status: (code: number) => HealthResponse;
  json: (payload: unknown) => HealthResponse;
}

export default function handler(_req: unknown, res: HealthResponse) {
  res.status(200).json({ status: "ok", message: "Controle 360 API is running on Vercel" });
}
