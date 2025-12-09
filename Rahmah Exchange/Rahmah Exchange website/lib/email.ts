import nodemailer from "nodemailer";


type SendEmailParams = {
	to: string | string[]
	subject: string
	html?: string
	text?: string
	from?: string
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
	if (transporter) return transporter

	const user = process.env.EMAIL_USER
	const pass = process.env.EMAIL_PASS

	if (!user || !pass) {
		console.warn("[email] EMAIL_USER/EMAIL_PASS not set. Emails will be skipped.")
		return null
	}

	transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: { user, pass },
	})

	return transporter
}

export async function sendEmail(params: SendEmailParams) {
	const tx = getTransporter()
	if (!tx) {
		return { skipped: true }
	}

	const from = params.from ?? `"Rahmah Support" <${process.env.EMAIL_USER}>`

	try {
		const info = await tx.sendMail({
			from,
			to: params.to,
			subject: params.subject,
			text: params.text,
			html: params.html,
		})
		return { messageId: info.messageId }
	} catch (err) {
		console.error("[email] sendMail error:", err)
		return { error: (err as Error).message }
	}
}

export function getAdminEmail(): string | undefined {
	return process.env.ADMIN_EMAIL
}
