import orbImage from '@/assets/primis-orb-circular.png';

interface BrainLogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function BrainLogo({ size = 'medium', className = '' }: BrainLogoProps) {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20',
    large: 'w-32 h-32',
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Glowing background effect */}
      <div className="absolute inset-0 bg-cyan-500/40 rounded-full blur-3xl animate-pulse-glow"></div>
      <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      
      {/* Orb image - perfectly circular with overflow hidden */}
      <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-transparent">
        <img 
          src={orbImage}
          alt="PRIMIS AI"
          className="w-full h-full object-cover rounded-full drop-shadow-[0_0_30px_rgba(0,191,255,1)] animate-pulse-glow"
        />
      </div>
    </div>
  );
}
