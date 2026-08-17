import React from 'react';
import type { AxiosError } from 'axios';
import httpClient from '../services/http';

interface Draft { name: string; game: string; format: string; status: string; location?: string | null; description?: string | null; start_date?: string | null; end_date?: string | null; prize_pool: number; max_teams: number; }

const TournamentCopilot: React.FC = () => {
  const [instruction, setInstruction] = React.useState('Create a 32-team Valorant double-elimination tournament with registration opening this week.');
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const generate = async () => {
    setBusy(true);
    setMessage('');
    setDraft(null);
    try {
      const response = await httpClient.post('/ai/tournament-copilot/draft', { instruction });
      setDraft(response.data as Draft);
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to generate a tournament draft.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface"><div className="hero-inner"><p className="section-label">AI organizer assistant</p><h1 className="hero-title">Describe the tournament. Review the draft.</h1><p>The copilot only proposes configuration. It never persists or publishes an AI-generated tournament automatically.</p></div></section>
      <section className="section-card"><div className="section-card-inner"><label className="field-label" htmlFor="copilot-instruction">Organizer request</label><textarea id="copilot-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={7} /><div className="cta-row"><button type="button" className="btn btn-primary" onClick={() => void generate()} disabled={busy || instruction.trim().length < 10}>{busy ? 'Generating...' : 'Generate draft'}</button></div>{message ? <p className="message-text">{message}</p> : null}</div></section>
      {draft ? <section className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Review before saving</p><h2>{draft.name}</h2></div><span className="small-pill">Draft only</span></div><div className="detail-grid"><div><span className="meta-label">Game</span><span className="meta-value">{draft.game}</span></div><div><span className="meta-label">Format</span><span className="meta-value">{draft.format}</span></div><div><span className="meta-label">Status</span><span className="meta-value">{draft.status}</span></div><div><span className="meta-label">Max teams</span><span className="meta-value">{draft.max_teams}</span></div><div><span className="meta-label">Prize pool</span><span className="meta-value">{draft.prize_pool}</span></div><div><span className="meta-label">Location</span><span className="meta-value">{draft.location || 'TBA'}</span></div></div><p>{draft.description || 'No description generated.'}</p><p className="message-text">Review the fields above and create the tournament through the normal validated organizer flow.</p></div></section> : null}
    </div>
  );
};

export default TournamentCopilot;
