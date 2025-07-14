import React from 'react';
import { SupperOption, VotingResult } from '../types';

interface SupperOptionCardProps {
  option: SupperOption;
  currentFamilyMember: string;
  votingResults: VotingResult[];
  onVote: (supperOptionId: number) => void;
  onRemoveVote: (supperOptionId: number) => void;
}

const SupperOptionCard: React.FC<SupperOptionCardProps> = ({
  option,
  currentFamilyMember,
  votingResults,
  onVote,
  onRemoveVote
}) => {
  const result = votingResults.find(r => r.option.id === option.id);
  const hasVoted = result?.voters.includes(currentFamilyMember) || false;
  const voters = result?.voters || [];

  return (
    <div className="supper-option-card">
      <div className="card-header">
        <h3>{option.name}</h3>
        <div className="vote-count">
          <span className="count">{option.voteCount}</span>
          <span className="label">votes</span>
        </div>
      </div>
      
      <p className="description">{option.description}</p>
      
      {voters.length > 0 && (
        <div className="voters">
          <p className="voters-label">Voted by:</p>
          <div className="voters-list">
            {voters.map((voter, index) => (
              <span key={index} className="voter-tag">
                {voter}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="card-actions">
        {!currentFamilyMember ? (
          <p className="no-member-message">Select a family member to vote</p>
        ) : hasVoted ? (
          <button
            className="remove-vote-btn"
            onClick={() => onRemoveVote(option.id)}
          >
            Remove Vote ❌
          </button>
        ) : (
          <button
            className="vote-btn"
            onClick={() => onVote(option.id)}
          >
            Vote for this! 👍
          </button>
        )}
      </div>
      
      <div className="card-footer">
        <small>
          Added by {option.createdBy} on {new Date(option.createdAt).toLocaleDateString()}
        </small>
      </div>
    </div>
  );
};

export default SupperOptionCard;