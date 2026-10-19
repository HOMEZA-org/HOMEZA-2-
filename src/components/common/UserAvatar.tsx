import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../../types';

interface UserAvatarProps {
  user?: Partial<User> | null;
  avatarUrl?: string | null;
  fullName?: string;
  role?: UserRole | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showRoleBadge?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  avatarUrl,
  fullName,
  role,
  size = 'md',
  className = '',
  showRoleBadge = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const effectiveAvatarUrl = avatarUrl !== undefined ? avatarUrl : user?.avatarUrl;
  const effectiveName = fullName || user?.fullName || 'User';
  const effectiveRole = role || user?.role;

  // Size mappings
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-12 h-12',
  };

  // Determine avatar icon background theme based on role
  const getAvatarBg = () => {
    switch (effectiveRole) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'LANDLORD':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'AGENT':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'TENANT':
      default:
        return 'bg-stone-200 text-stone-700 border-stone-300';
    }
  };

  // If user has a real uploaded avatar and it hasn't errored
  const hasRealAvatar = Boolean(
    effectiveAvatarUrl &&
      effectiveAvatarUrl.trim() !== '' &&
      !imageError
  );

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden border ${sizeClasses[size]} ${getAvatarBg()} ${className}`}
      title={effectiveName}
    >
      {hasRealAvatar ? (
        <img
          src={effectiveAvatarUrl!}
          alt={effectiveName}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <UserIcon className={`${iconSizes[size]} text-current opacity-80`} />
      )}

      {showRoleBadge && effectiveRole && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{
            backgroundColor:
              effectiveRole === 'ADMIN'
                ? '#9333ea'
                : effectiveRole === 'LANDLORD'
                ? '#d97706'
                : effectiveRole === 'AGENT'
                ? '#047857'
                : '#2563eb',
          }}
          title={effectiveRole}
        />
      )}
    </div>
  );
};
