'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { t } from '@/locales';
import { FamilySelector } from '@/components/identity/FamilySelector';
import { InviteLinkDialog } from '@/components/common/InviteLinkDialog';

export function FamilyManagement() {
  const { familyMembers, isLoading } = useFamily();
  const [inviteTarget, setInviteTarget] = useState<{ memberId: string; memberName: string } | null>(
    null
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Member List & Add Section */}
      <div className="w-full rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
        <div className="flex items-center gap-2 mb-6">
          <Settings2 className="h-4 w-4 text-indigo/60" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo/60">
            {t('profile.manageFamily', 'Manage Family')}
          </h3>
        </div>

        <FamilySelector
          onFamilyMemberSelected={() => {}}
          onInvite={(id, name) => setInviteTarget({ memberId: id, memberName: name })}
          isLoading={isLoading}
        />
      </div>

      {inviteTarget && (
        <InviteLinkDialog
          memberId={inviteTarget.memberId}
          memberName={inviteTarget.memberName}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
}
