import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { SupperOption, VotingResult } from '../types';
import SupperOptionCard from './SupperOptionCard';
import AddSupperOptionForm from './AddSupperOptionForm';
import VotingResults from './VotingResults';
import FamilyMemberSelector from './FamilyMemberSelector';
import './VotingApp.css';

const VotingApp: React.FC = () => {
  const [supperOptions, setSupperOptions] = useState<SupperOption[]>([]);
  const [votingResults, setVotingResults] = useState<VotingResult[]>([]);
  const [currentFamilyMember, setCurrentFamilyMember] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [options, results] = await Promise.all([
        apiService.getSupperOptions(),
        apiService.getVotingResults()
      ]);
      setSupperOptions(options);
      setVotingResults(results);
      setError('');
    } catch (err) {
      setError('Failed to load data. Make sure the API is running.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (supperOptionId: number) => {
    if (!currentFamilyMember) {
      setError('Please select a family member first!');
      return;
    }

    try {
      await apiService.vote({ supperOptionId, familyMember: currentFamilyMember });
      await loadData(); // Refresh data
      setError('');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('You have already voted for this option!');
      } else {
        setError('Failed to submit vote. Please try again.');
      }
    }
  };

  const handleRemoveVote = async (supperOptionId: number) => {
    if (!currentFamilyMember) {
      setError('Please select a family member first!');
      return;
    }

    try {
      await apiService.removeVote(currentFamilyMember, supperOptionId);
      await loadData(); // Refresh data
      setError('');
    } catch (err) {
      setError('Failed to remove vote. Please try again.');
    }
  };

  const handleAddOption = async (name: string, description: string) => {
    try {
      await apiService.createSupperOption({
        name,
        description,
        createdBy: currentFamilyMember || 'Anonymous'
      });
      await loadData(); // Refresh data
      setShowAddForm(false);
      setError('');
    } catch (err) {
      setError('Failed to add supper option. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="voting-app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="voting-app">
      <FamilyMemberSelector
        currentMember={currentFamilyMember}
        onMemberChange={setCurrentFamilyMember}
      />

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="controls">
        <button
          className={`control-btn ${showResults ? 'active' : ''}`}
          onClick={() => setShowResults(!showResults)}
        >
          {showResults ? 'Hide Results' : 'Show Results'} 📊
        </button>
        <button
          className={`control-btn ${showAddForm ? 'active' : ''}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Option'} ➕
        </button>
        <button
          className="control-btn refresh"
          onClick={loadData}
        >
          Refresh 🔄
        </button>
      </div>

      {showAddForm && (
        <AddSupperOptionForm
          onSubmit={handleAddOption}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {showResults && (
        <VotingResults results={votingResults} />
      )}

      <div className="supper-options">
        <h2>Supper Options</h2>
        {supperOptions.length === 0 ? (
          <p>No supper options available. Add one to get started!</p>
        ) : (
          <div className="options-grid">
            {supperOptions.map((option) => (
              <SupperOptionCard
                key={option.id}
                option={option}
                currentFamilyMember={currentFamilyMember}
                votingResults={votingResults}
                onVote={handleVote}
                onRemoveVote={handleRemoveVote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingApp;