export default function handler(req, res) {
  const { pin } = req.body || {};
  const realPin = process.env.ADMIN_PIN;

  if (!realPin) {
    return res.status(500).json({ ok: false, message: 'Admin PIN is not configured on the server.' });
  }

  if (String(pin).trim() === String(realPin)) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, message: 'Incorrect PIN. Access denied.' });
}
