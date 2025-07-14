import React from 'react';
import { VotingResult } from '../types';

interface VotingResultsProps {
  results: VotingResult[];
}

const VotingResults: React.FC<VotingResultsProps> = ({ results }) => {
  const sortedResults = [...results].sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = results.reduce((sum, result) => sum + result.voteCount, 0);

  return (
    <div className="voting-results">
      <h3>📊 Voting Results</h3>
      {sortedResults.length === 0 ? (
        <p>No votes yet!</p>
      ) : (
        <>
          <div className="results-summary">
            <p>Total votes: <strong>{totalVotes}</strong></p>
            {sortedResults[0].voteCount > 0 && (
              <p className="winner">
                🏆 Current winner: <strong>{sortedResults[0].option.name}</strong> 
                ({sortedResults[0].voteCount} votes)
              </p>
            )}
          </div>
          
          <div className="results-list">
            {sortedResults.map((result, index) => {
              const percentage = totalVotes > 0 ? Math.round((result.voteCount / totalVotes) * 100) : 0;
              return (
                <div key={result.option.id} className="result-item">
                  <div className="result-header">
                    <span className="rank">#{index + 1}</span>
                    <span className="option-name">{result.option.name}</span>
                    <span className="vote-info">
                      {result.voteCount} votes ({percentage}%)
                    </span>
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {result.voters.length > 0 && (
                    <div className="voters-summary">
                      <span>Voters: </span>
                      {result.voters.map((voter, i) => (
                        <span key={i} className="voter-tag">
                          {voter}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default VotingResults;