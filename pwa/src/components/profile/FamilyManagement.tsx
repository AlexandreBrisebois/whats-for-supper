'use client';

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { t } from '@/locales';
import { FamilySelector } from '@/components/identity/FamilySelector';
import { InviteLinkDialog } from '@/components/common/InviteLinkDialog';

export function FamilyManagement() {
  const { familyMembers, isLoading, loadFamily, hasLoaded } = useFamily();
  const [inviteTarget, setInviteTarget] = useState<{ memberId: string; memberName: string } | null>(
    null
  );

  useEffect(() => {
    if (!hasLoaded) {
      void loadFamily();
    }
  }, [hasLoaded, loadFamily]);

  return (
    <div className="flex flex-col gap-6">
      {/* Member List & Add Section */}
      <div className="w-full min-w-0 rounded-3xl bg-white border border-chrome-line p-8 shadow-card">
        <div className="flex items-center gap-3 mb-8">
          <Settings2 className="h-4 w-4 text-hearth-ink" />
          <h3 className="text-xs font-semibold text-hearth-ink">
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
