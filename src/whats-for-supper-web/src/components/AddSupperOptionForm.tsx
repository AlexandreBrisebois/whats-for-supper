import React, { useState } from 'react';

interface AddSupperOptionFormProps {
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
}

const AddSupperOptionForm: React.FC<AddSupperOptionFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim()) {
      onSubmit(name.trim(), description.trim());
      setName('');
      setDescription('');
    }
  };

  return (
    <div className="add-option-form">
      <h3>➕ Add New Supper Option</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Homemade Pizza"
            required
            maxLength={100}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Delicious pizza with fresh toppings"
            required
            maxLength={500}
            rows={3}
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={!name.trim() || !description.trim()}>
            Add Option ✅
          </button>
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel ❌
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSupperOptionForm;