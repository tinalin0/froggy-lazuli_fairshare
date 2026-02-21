const COLORS = [
  'bg-[#CFE0D8] text-[#344F52]',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-[#FDF3E9] text-[#D4813F]',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
];

function colorFor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name = '?', size = 'md' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClass = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size];

  return (
    <div className={`${sizeClass} ${colorFor(name)} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}
