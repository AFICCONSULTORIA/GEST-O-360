export default function handler(req: any, res: any) {
  res.status(200).json({ status: "ok", message: "Controle 360 API is running on Vercel" });
}
