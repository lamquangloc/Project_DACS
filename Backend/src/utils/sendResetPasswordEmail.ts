import nodemailer from 'nodemailer';

export async function sendResetPasswordEmail(toEmail: string, resetLink: string) {
  const transporter = nodemailer.createTransport({
    // Thay đổi cấu hình SMTP cho phù hợp với dịch vụ email của bạn
    service: 'gmail',
    auth: {
      user: 'lamquangloc81@gmail.com', // Thay bằng email gửi
      pass: 'ccan kmaf afbp krsf'     // Thay bằng app password (không dùng mật khẩu gmail thường)
    }
  });

  const mailOptions = {
    from: 'Nhà hàng của bạn <lamquangloc81@gmail.com>',
    to: toEmail,
    subject: 'Yêu cầu đặt lại mật khẩu',
    html: `
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
      <p>Nhấn vào nút dưới đây để đặt lại mật khẩu (liên kết chỉ có hiệu lực trong 10 phút):</p>
      <a href="${resetLink}" style="
        display: inline-block;
        padding: 12px 28px;
        background: #1677ff;
        color: #fff;
        border-radius: 6px;
        text-decoration: none;
        font-weight: bold;
        font-size: 16px;
        margin: 16px 0;
      " target="_blank">Đặt lại mật khẩu</a>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `
  };

  await transporter.sendMail(mailOptions);
} 