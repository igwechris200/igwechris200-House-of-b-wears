import { whatsappLink } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

export async function WhatsAppButton() {
  const s = await getSettings();
  if (!s.whatsapp_number) return null;
  return (
    <a
      href={whatsappLink(s.whatsapp_number, `Hello ${s.store_name}, I'd like to make an enquiry.`)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pl-3 pr-4 text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105"
    >
      <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
        <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.3.7 4.6 1.9 6.5L4 29l7.8-1.9c1.8 1 3.9 1.5 6 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.7c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.6 1.1 1.2-4.4-.3-.4c-1.1-1.7-1.7-3.6-1.7-5.6 0-5.5 4.6-10 10.2-10s10.2 4.5 10.2 10-4.6 10-10.3 10zm5.6-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4z" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">Chat with us</span>
    </a>
  );
}
