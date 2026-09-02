import { config } from '../config.js';

export async function sendResetCodeEmail(email, code) {
  if (!email) {
    throw new Error('该账号未绑定邮箱，无法通过邮箱重置密码');
  }

  if (config.mail.provider === 'smtp') {
    return sendViaSmtp(email, code);
  }

  return true;
}

async function sendViaSmtp(email, code) {
  const nodemailer = (await import('nodemailer')).default;
  const smtp = config.mail.smtp;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: config.mail.from,
    to: email,
    subject: '找回密码验证码',
    text: `您的验证码为：${code}，5 分钟内有效。请勿泄露给他人。`,
    html: `<p>您的验证码为：<strong style="font-size:20px">${code}</strong></p>
           <p>5 分钟内有效，请勿泄露给他人。</p>`,
  });
  return true;
}
