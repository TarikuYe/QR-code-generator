import { QrCode, Link, Type, Mail, Phone, MessageSquare, Smartphone, Wifi, CreditCard, MapPin, Calendar, User } from 'lucide-react';

export const QR_TYPES = [
  { id: 'url',    label: 'URL',      icon: Link,           fields: [{ key: 'url', label: 'Website URL', placeholder: 'https://example.com', type: 'url', required: true }] },
  { id: 'text',   label: 'Text',     icon: Type,           fields: [{ key: 'text', label: 'Text Content', placeholder: 'Enter your text...', type: 'textarea', required: true }] },
  { id: 'email',  label: 'Email',    icon: Mail,           fields: [
    { key: 'email', label: 'Email Address', placeholder: 'user@example.com', type: 'email', required: true },
    { key: 'subject', label: 'Subject', placeholder: 'Optional subject', type: 'text' },
    { key: 'body', label: 'Body', placeholder: 'Optional email body', type: 'textarea' },
  ]},
  { id: 'phone',  label: 'Phone',    icon: Phone,          fields: [{ key: 'phone', label: 'Phone Number', placeholder: '+1234567890', type: 'tel', required: true }] },
  { id: 'sms',    label: 'SMS',      icon: MessageSquare,  fields: [
    { key: 'phone', label: 'Phone Number', placeholder: '+1234567890', type: 'tel', required: true },
    { key: 'message', label: 'Message', placeholder: 'Optional message', type: 'textarea' },
  ]},
  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone,   fields: [
    { key: 'phone', label: 'Phone Number', placeholder: '+1234567890', type: 'tel', required: true },
    { key: 'message', label: 'Message', placeholder: 'Hello!', type: 'text' },
  ]},
  { id: 'wifi',   label: 'WiFi',     icon: Wifi,           fields: [
    { key: 'ssid', label: 'Network Name (SSID)', placeholder: 'My WiFi', type: 'text', required: true },
    { key: 'password', label: 'Password', placeholder: 'Enter password', type: 'text' },
    { key: 'encryption', label: 'Encryption', type: 'select', options: ['WPA/WPA2', 'WEP', 'None'] },
  ]},
  { id: 'vcard',  label: 'Contact',  icon: User,           fields: [
    { key: 'name', label: 'Full Name', placeholder: 'John Doe', type: 'text', required: true },
    { key: 'phone', label: 'Phone', placeholder: '+1234567890', type: 'tel' },
    { key: 'email', label: 'Email', placeholder: 'john@example.com', type: 'email' },
    { key: 'org', label: 'Organization', placeholder: 'Company Inc.', type: 'text' },
    { key: 'title', label: 'Job Title', placeholder: 'Software Engineer', type: 'text' },
    { key: 'url', label: 'Website', placeholder: 'https://example.com', type: 'url' },
    { key: 'address', label: 'Address', placeholder: '123 Main St', type: 'text' },
  ]},
  { id: 'location', label: 'Location', icon: MapPin,       fields: [
    { key: 'lat', label: 'Latitude', placeholder: '40.7128', type: 'number', required: true },
    { key: 'lng', label: 'Longitude', placeholder: '-74.0060', type: 'number', required: true },
    { key: 'label', label: 'Label', placeholder: 'New York City', type: 'text' },
  ]},
  { id: 'event',  label: 'Event',    icon: Calendar,       fields: [
    { key: 'title', label: 'Event Title', placeholder: 'Team Meeting', type: 'text', required: true },
    { key: 'start', label: 'Start Date/Time', placeholder: '2025-01-01T09:00', type: 'text' },
    { key: 'end', label: 'End Date/Time', placeholder: '2025-01-01T10:00', type: 'text' },
    { key: 'location', label: 'Location', placeholder: 'Conference Room', type: 'text' },
    { key: 'description', label: 'Description', placeholder: 'Event details...', type: 'textarea' },
  ]},
];

export function buildQRData(type, values) {
  const v = (k) => (values[k] || '').trim();
  switch (type) {
    case 'url': return v('url');
    case 'text': return v('text');
    case 'email': {
      let s = `mailto:${v('email')}`;
      const params = [];
      if (v('subject')) params.push(`subject=${encodeURIComponent(v('subject'))}`);
      if (v('body')) params.push(`body=${encodeURIComponent(v('body'))}`);
      if (params.length) s += `?${params.join('&')}`;
      return s;
    }
    case 'phone': return `tel:${v('phone')}`;
    case 'sms': {
      let s = `SMSTO:${v('phone')}`;
      if (v('message')) s += `:${v('message')}`;
      return s;
    }
    case 'whatsapp': return `https://wa.me/${v('phone').replace(/[^0-9]/g,'')}?text=${encodeURIComponent(v('message') || '')}`;
    case 'wifi': {
      const enc = v('encryption') === 'None' ? '' : (v('encryption') === 'WEP' ? 'WEP' : 'WPA');
      return `WIFI:T:${enc};S:${v('ssid')};P:${v('password')};;`;
    }
    case 'vcard': {
      const n = v('name');
      const parts = [`BEGIN:VCARD`,`VERSION:3.0`,`FN:${n}`];
      if (n) parts.push(`N:${n.split(' ').reverse().join(';')};`);
      if (v('phone')) parts.push(`TEL:${v('phone')}`);
      if (v('email')) parts.push(`EMAIL:${v('email')}`);
      if (v('org')) parts.push(`ORG:${v('org')}`);
      if (v('title')) parts.push(`TITLE:${v('title')}`);
      if (v('url')) parts.push(`URL:${v('url')}`);
      if (v('address')) parts.push(`ADR:;;${v('address')}`);
      parts.push(`END:VCARD`);
      return parts.join('\n');
    }
    case 'location': return `geo:${v('lat')},${v('lng')}${v('label') ? `?q=${encodeURIComponent(v('label'))}` : ''}`;
    case 'event': {
      const lines = [`BEGIN:VEVENT`];
      if (v('title')) lines.push(`SUMMARY:${v('title')}`);
      if (v('start')) lines.push(`DTSTART:${v('start').replace(/[^0-9T]/g,'')}`);
      if (v('end')) lines.push(`DTEND:${v('end').replace(/[^0-9T]/g,'')}`);
      if (v('location')) lines.push(`LOCATION:${v('location')}`);
      if (v('description')) lines.push(`DESCRIPTION:${v('description')}`);
      lines.push(`END:VEVENT`);
      return `BEGIN:VCALENDAR\nVERSION:2.0\n${lines.join('\n')}\nEND:VCALENDAR`;
    }
    default: return v('url') || v('text') || '';
  }
}
