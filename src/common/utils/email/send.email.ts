import nodeMailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { BadRequestException } from "../../exceptions";
import {
  APPLICATION_NAME,
  EMAIL_APP,
  EMAIL_APP_PASSWORD,
} from "../../../config/config";

export const sendEmail = async ({
  to,
  cc,
  bcc,
  subject,
  html,
  attachments = [],
}: Mail.Options): Promise<void> => {
  if (!to && !cc && !bcc) {
    throw new BadRequestException("Invalid Recipient");
  }

  if (!(html as string)?.length && !attachments?.length) {
    throw new BadRequestException("Invalid Mail Content");
  }

  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_APP,
      pass: EMAIL_APP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"${APPLICATION_NAME}" <${EMAIL_APP}>`,
    to,
    cc,
    bcc,
    subject,
    html,
    attachments,
  });

  console.log("Message sent : ", info.messageId);
};
