const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { load, save, nextId } = require('../store');
const { hashPwd, requireAuth, requireRole } = require('../middleware/auth');

const ROLES = ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'TECHNICIEN'];
const INVITE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

// ── Envoi email via SMTP configuré dans settings ──────────────────────────
async function sendInviteEmail(to, link, inviterNom, settings) {
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) return false;
    try {
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: Number(settings.smtp_port) || 465,
            secure: (Number(settings.smtp_port) || 465) === 465,
            auth: { user: settings.smtp_user, pass: settings.smtp_pass },
        });
        await transporter.sendMail({
            from: `"Leasevora" <${settings.smtp_user}>`,
            to,
            subject: '🪹 Invitation à rejoindre Leasevora',
            html: `
                <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#faf9f5;border-radius:16px">
                  <div style="font-size:32px;margin-bottom:8px">🪹</div>
                  <h2 style="margin:0 0 8px;color:#1c1b18;font-size:22px">Vous êtes invité à rejoindre Leasevora</h2>
                  <p style="color:#524f47;font-size:15px;margin:0 0 24px">
                    <strong>${inviterNom}</strong> vous invite à accéder à l'application de gestion immobilière Leasevora.
                  </p>
                  <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px">
                    Créer mon compte
                  </a>
                  <p style="color:#8a8780;font-size:12px;margin:24px 0 0">
                    Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.
                  </p>
                </div>`,
        });
        return true;
    } catch (e) {
        console.error('Email invite failed:', e.message);
        return false;
    }
}

// ── POST /api/invite — créer une invitation (admin only) ──────────────────
router.post('/', requireAuth, requireRole('PROPRIETAIRE'), async (req, res) => {
    const { email, role, permissions } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'email et role requis' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

    const data = load();

    // Vérifier que l'email n'est pas déjà utilisé
    if (data.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    // Supprimer les anciennes invitations pour cet email
    data.invitations = (data.invitations || []).filter(i => i.email !== email);

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = {
        id: nextId(data, 'invitations'),
        token,
        email,
        role,
        permissions: Array.isArray(permissions) ? permissions : [],
        invited_by: req.user.id,
        invited_by_nom: `${req.user.prenom || ''} ${req.user.nom}`.trim(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + INVITE_TTL).toISOString(),
        used: false,
    };
    data.invitations.push(invitation);
    save(data);

    // Construire le lien
    const host = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const link = `${host}/invite.html?token=${token}`;

    // Tenter l'envoi email
    const emailSent = await sendInviteEmail(email, link, invitation.invited_by_nom, data.settings || {});

    res.status(201).json({ success: true, link, emailSent, token });
});

// ── GET /api/invite/:token — vérifier un token (public) ───────────────────
router.get('/:token', (req, res) => {
    const data = load();
    const inv = (data.invitations || []).find(i => i.token === req.params.token);
    if (!inv) return res.status(404).json({ error: 'Invitation invalide ou expirée' });
    if (inv.used) return res.status(410).json({ error: 'Cette invitation a déjà été utilisée' });
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Cette invitation a expiré' });
    res.json({ email: inv.email, role: inv.role, invited_by_nom: inv.invited_by_nom });
});

// ── POST /api/invite/:token/accept — accepter une invitation (public) ─────
router.post('/:token/accept', (req, res) => {
    const { nom, prenom, login, password } = req.body;
    if (!nom || !login || !password) return res.status(400).json({ error: 'nom, login et password requis' });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });

    const data = load();
    const idx = (data.invitations || []).findIndex(i => i.token === req.params.token);
    if (idx === -1) return res.status(404).json({ error: 'Invitation invalide ou expirée' });

    const inv = data.invitations[idx];
    if (inv.used) return res.status(410).json({ error: 'Cette invitation a déjà été utilisée' });
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Cette invitation a expiré' });

    // Vérifier login unique
    if (data.users.find(u => u.login === login)) return res.status(400).json({ error: 'Ce login est déjà utilisé' });

    const user = {
        id: nextId(data, 'users'),
        nom,
        prenom: prenom || null,
        email: inv.email,
        login,
        password: hashPwd(password),
        role: inv.role,
        permissions: inv.permissions || [],
        actif: true,
        created_at: new Date().toISOString(),
    };
    data.users.push(user);
    data.invitations[idx].used = true;
    data.invitations[idx].accepted_at = new Date().toISOString();
    save(data);

    res.status(201).json({ success: true, message: 'Compte créé avec succès' });
});

module.exports = router;
