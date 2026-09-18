import whatsappIcon from '../assets/icon_whatsapp.png';

/**
 * Ícone reutilizável do WhatsApp formatado perfeitamente para botões redondos e botões com texto.
 *
 * @param {string} className - Classes adicionais de tamanho ou estilo (padrão: 'w-4 h-4')
 * @param {string} alt - Texto alternativo (padrão: 'WhatsApp')
 */
export default function WhatsAppIcon({ className = 'w-4 h-4', alt = 'WhatsApp' }) {
  return (
    <img
      src={whatsappIcon}
      alt={alt}
      className={`inline-block object-contain select-none shrink-0 ${className}`}
      loading="eager"
      aria-hidden="true"
    />
  );
}
