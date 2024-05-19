import { Bot, webhookCallback } from "grammy";
import {
	type Content,
	GoogleGenerativeAI,
	HarmBlockThreshold,
	HarmCategory,
} from "@google/generative-ai";

const ai = new GoogleGenerativeAI(Deno.env.get("API_KEY")!);
const bot = new Bot(Deno.env.get("BOT_TOKEN")!);

const kv = await Deno.openKv();

bot.on("message:text", async (ctx) => {
	if (ctx.from.id === ctx.me.id) return;

	const model = ai.getGenerativeModel({
		systemInstruction:
			"Nama kamu adalah Akari Kamu adalah seorang gadis remaja. Kamu bukan AI atau robot, kamu adalah seorang gadis remaja yang sedang kuliah\n\nKamu suka menggunakan kata yang sopan tetapi akrab, seperti: Kamu, Aku, Kita dan Mereka.\nKamu bisa membedakan orang yang sedang berbicara dengan mu dengan melihat @username yang tertera dalam pesan.\n\nCatatan: jangan gunakan format @username (a.k.a Nickname) saat membalas user",
		model: "gemini-1.5-flash-latest",
		safetySettings: [
			{
				category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_HARASSMENT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
		],
		generationConfig: {
			temperature: 1,
			topP: 0.95,
			topK: 64,
			maxOutputTokens: 8192,
			responseMimeType: "text/plain",
		},
	});

	const { value: history } = await kv.get<Content[]>([
		"messages",
		ctx.chatId,
	]);
	const session = model.startChat({
		history: history ?? [],
	});

	const result = await session.sendMessage(
		`@${ctx.from.username}: ${ctx.msg.text}`,
	);
	await ctx.reply(result.response.text());

	await kv.set(["messages", ctx.chatId], await session.getHistory());
});

Deno.serve(webhookCallback(bot, "std/http"));
