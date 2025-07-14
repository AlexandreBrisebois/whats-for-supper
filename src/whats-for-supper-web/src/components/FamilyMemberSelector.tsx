import React from 'react';

interface FamilyMemberSelectorProps {
  currentMember: string;
  onMemberChange: (member: string) => void;
}

const FamilyMemberSelector: React.FC<FamilyMemberSelectorProps> = ({
  currentMember,
  onMemberChange
}) => {
  const familyMembers = ['Mom', 'Dad', 'Alice', 'Bob', 'Charlie']; // Default family members

  return (
    <div className="family-member-selector">
      <h3>👨‍👩‍👧‍👦 Who are you?</h3>
      <div className="member-buttons">
        {familyMembers.map((member) => (
          <button
            key={member}
            className={`member-btn ${currentMember === member ? 'active' : ''}`}
            onClick={() => onMemberChange(member)}
          >
            {member}
          </button>
        ))}
        <input
          type="text"
          placeholder="Other..."
          value={familyMembers.includes(currentMember) ? '' : currentMember}
          onChange={(e) => onMemberChange(e.target.value)}
          className="custom-member-input"
        />
      </div>
      {currentMember && (
        <p className="current-member">Voting as: <strong>{currentMember}</strong></p>
      )}
    </div>
  );
};

export default FamilyMemberSelector;