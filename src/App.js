import React, { useState, useEffect } from 'react';
import { Menu, X, Plus, Edit2, Trash2, ChevronDown, Users, BarChart3, Play, Eye } from 'lucide-react';
import { supabase } from './supabase';
import "./styles.css";



// ============================================================================
// CRICKET SCORING APPLICATION - ARCHITECTURE OVERVIEW
// ============================================================================
//
// DATA PERSISTENCE & RESUME MATCH FUNCTIONALITY:
// -----------------------------------------------
// The app uses localStorage to persist three key data structures:
//
// 1. 'activeMatch' (key: activeMatch)
//    - Stores the current ongoing match state
//    - Includes: innings data, batsmen/bowler stats, ball-by-ball records, current batsmen/bowler
//    - Automatically saved after every ball
//    - Cleared when match is completed
//    - Enables resume functionality across browser sessions
//
// 2. 'completedMatches' (key: completedMatches)
//    - Array of all finished matches
//    - Used for statistics and historical data
//    - Match is moved here from activeMatch when completed
//
// 3. 'players' (key: players)
//    - Master list of all players
//    - Used for team selection in match setup
//
// MATCH STATE STRUCTURE:
// ----------------------
// {
//   id: timestamp,
//   overs: number,
//   team1: { name, players: [playerIds] },
//   team2: { name, players: [playerIds] },
//   toss: { winner, decision },
//   currentInnings: 1 or 2,
//   innings: {
//     1: { battingTeam, bowlingTeam, score, wickets, balls, batsmen: {}, bowlers: {}, ... },
//     2: { ... }
//   },
//   completed: boolean
// }
//
// RESUME MATCH WORKFLOW:
// ----------------------
// 1. On app load: Check localStorage for 'activeMatch'
// 2. If found and not completed: Show "Resume Match" prominently on home screen
// 3. On resume: Load match state → navigate directly to scoring screen
// 4. Continue scoring from exact point (over, ball, batsmen, bowler preserved)
// 5. On completion: Move to completedMatches, clear activeMatch
//
// EXTRAS SCORING LOGIC:
// ---------------------
// Wide:
//   - Base penalty: +1 run
//   - Ball does NOT count towards over
//   - Batsman gets 0 runs
//   - Additional runs can be taken (total = 1 + additional)
//
// No Ball:
//   - Base penalty: +1 run  
//   - Ball does NOT count towards over
//   - Batsman CAN score runs off bat (credited to batsman)
//   - Total runs = 1 + runs off bat
//
// Bye / Leg Bye:
//   - No base penalty
//   - Ball COUNTS towards over
//   - Batsman gets 0 runs
//   - Only the runs taken are added
//
// ============================================================================

// ============================================================================
// UTILITY FUNCTIONS & CONSTANTS
// ============================================================================

const DISMISSAL_TYPES = ['Bowled', 'Caught', 'Run Out', 'LBW', 'Stumped', 'Hit Wicket'];
const EXTRA_TYPES = ['Wide', 'No Ball', 'Bye', 'Leg Bye'];

// Local storage helpers
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function CricketScorer() {
  const enableScorerMode = () => {
  const password = prompt("Enter Scorer Passcode:");

  if (password === "cricket123") {
    setIsScorer(true);
    localStorage.setItem("isScorer", "true");
    alert("Scorer Mode Enabled");
  } else {
    alert("Wrong passcode");
  }
};

  const disableScorerMode = () => {
  setIsScorer(false);
  localStorage.removeItem("isScorer");
};

  
  const [screen, setScreen] = useState('home'); // home, players, record-setup, scoring, view, stats, match-complete
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Players data
  const [players, setPlayers] = useState([]);
  
  // Current match setup
  const [matchSetup, setMatchSetup] = useState(null);
  
  // Live match state - persisted across sessions
  const [liveMatch, setLiveMatch] = useState(null);

  // Load active match from Supabase
useEffect(() => {
  const loadMatch = async () => {
    const { data } = await supabase
      .from('active_match')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setLiveMatch(data.match_data);
    }
  };

  loadMatch();
}, []);

  // Load players from Supabase
useEffect(() => {
  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setPlayers(data);
    }
  };

  loadPlayers();
}, []);

  
  // All completed matches
  const [matches, setMatches] = useState(() => storage.get('completedMatches', []));

  // Persist active match for resume functionality
  useEffect(() => {
  const saveMatch = async () => {
    if (liveMatch) {
      await supabase
        .from('active_match')
        .upsert({ id: 1, match_data: liveMatch });
    }
  };

  saveMatch();
}, [liveMatch]);

  useEffect(() => {
    storage.set('completedMatches', matches);
  }, [matches]);

  // Navigation handlers
  const goHome = () => {
    setScreen('home');
    setMenuOpen(false);
  };

  const goToPlayers = () => {
    setScreen('players');
    setMenuOpen(false);
  };

  const goToStats = () => {
    setScreen('stats');
    setMenuOpen(false);
  };

  const startRecording = () => {
    // Warn if there's an active match
    if (liveMatch && !liveMatch.completed) {
      if (!confirm('There is an active match in progress. Starting a new match will discard the current match. Continue?')) {
        return;
      }
      // Clear active match
      setLiveMatch(null);
    }
    
    setMatchSetup({
      step: 0,
      overs: '',
      team1Name: '',
      team2Name: '',
      team1Players: [],
      team2Players: [],
      tossWinner: '',
      tossDecision: ''
    });
    setScreen('record-setup');
    setMenuOpen(false);
  };

  const resumeMatch = () => {
    setScreen('scoring');
    setMenuOpen(false);
  };

  const viewScore = () => {
    setScreen('view');
    setMenuOpen(false);
  };

  const [isScorer, setIsScorer] = useState(
  localStorage.getItem('isScorer') === 'true'
);

  
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={goHome}
            className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            Cricket Scorer
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-16 bg-slate-800 border border-white/10 rounded-l-2xl p-6 min-w-[250px] animate-in">
            <nav className="space-y-3">

  {isScorer && liveMatch && !liveMatch.completed && (
    <button onClick={resumeMatch} className="w-full btn btn-primary justify-start">
      <Play size={20} /> Resume Match
    </button>
  )}

  {isScorer && (
    <button onClick={startRecording} className="w-full btn btn-primary justify-start">
      <Play size={20} /> {liveMatch && !liveMatch.completed ? 'New Match' : 'Record Score'}
    </button>
  )}

  <button onClick={viewScore} className="w-full btn btn-secondary justify-start">
    <Eye size={20} /> View Score
  </button>

  <button
    onClick={goToPlayers}
    className={`w-full btn btn-outline justify-start ${!isScorer ? 'opacity-70' : ''}`}
  >
    <Users size={20} /> Players Data
  </button>

  <button onClick={goToStats} className="w-full btn btn-outline justify-start">
    <BarChart3 size={20} /> Stats
  </button>

  {!isScorer ? (
    <button onClick={enableScorerMode} className="w-full btn btn-outline justify-start">
      🔐 Enable Scorer Mode
    </button>
  ) : (
    <button onClick={disableScorerMode} className="w-full btn btn-outline justify-start">
      🔓 Disable Scorer Mode
    </button>
  )}

</nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {screen === 'home' && (
          <HomeScreen 
  onRecord={startRecording}
  onResume={resumeMatch}
  onView={viewScore}
  hasLiveMatch={liveMatch !== null && !liveMatch?.completed}
  liveMatch={liveMatch}
  isScorer={isScorer}
/>
        )}
        
        {screen === 'players' && (
  <PlayersScreen
    isScorer={isScorer}
            players={players}
            setPlayers={setPlayers}
            onBack={goHome}
          />
        )}
        
        {screen === 'record-setup' && (
          <MatchSetupScreen
            setup={matchSetup}
            setSetup={setMatchSetup}
            players={players}
            onComplete={(match) => {
              setLiveMatch(match);
              setScreen('scoring');
            }}
            onCancel={goHome}
          />
        )}
        
        {screen === 'scoring' && liveMatch && (
          <ScoringScreen
  match={liveMatch}
  setMatch={setLiveMatch}
  players={players}
  onComplete={(completedMatch) => {
              setMatches([...matches, completedMatch]);
              setLiveMatch(null);
              setScreen('match-complete');
            }}
          />
        )}
        
        {screen === 'view' && (
          <ViewScreen
  match={liveMatch}
  players={players}
  onBack={goHome}
/>
        )}
        
        {screen === 'stats' && (
          <StatsScreen
            matches={matches}
            players={players}
            onBack={goHome}
          />
        )}
        
        {screen === 'match-complete' && matches.length > 0 && (
          <MatchCompleteScreen
            match={matches[matches.length - 1]}
            onHome={goHome}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// HOME SCREEN
// ============================================================================

function HomeScreen({ onRecord, onResume, onView, hasLiveMatch, liveMatch, isScorer }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8 animate-in">
      <div className="text-center space-y-4">
        <h2 className="text-6xl font-black tracking-tight">
          Cricket <span className="text-green-400">Scorer</span>
        </h2>
        <p className="text-xl text-slate-400">Track matches. Analyze stats. Simple & Fast.</p>
      </div>
      
      {hasLiveMatch ? (
        <>
          {/* Active Match Card */}
          <div className="w-full max-w-md card bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/30">
            <div className="text-center mb-4">
              <p className="text-sm text-green-400 font-semibold mb-2">📡 MATCH IN PROGRESS</p>
              <p className="text-xl font-bold">
                {liveMatch.innings[liveMatch.currentInnings]?.battingTeam}
              </p>
              <p className="text-3xl font-mono font-bold text-green-400 my-2">
                {liveMatch.innings[liveMatch.currentInnings]?.score}/{liveMatch.innings[liveMatch.currentInnings]?.wickets}
              </p>
              <p className="text-sm text-slate-400">
                Overs: {Math.floor(liveMatch.innings[liveMatch.currentInnings]?.balls / 6)}.{liveMatch.innings[liveMatch.currentInnings]?.balls % 6} / {liveMatch.overs}
              </p>
            </div>
            {isScorer ? (
  <button onClick={onResume} className="w-full btn btn-primary btn-lg">
    <Play size={24} />
    Resume Match
  </button>
) : (
  <button onClick={onView} className="w-full btn btn-secondary btn-lg">
    <Eye size={24} />
    View Match
  </button>
)}
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <button onClick={onRecord} className="btn btn-secondary flex-1">
              Start New Match
            </button>
            <button onClick={onView} className="btn btn-outline flex-1">
              <Eye size={20} />
              View Score
            </button>
          </div>
        </>
      ) : (
        <>
          {/* No Active Match - Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button onClick={onRecord} className="btn btn-primary btn-lg flex-1">
              <Play size={24} />
              Record New Match
            </button>
            <button onClick={onView} className="btn btn-secondary btn-lg flex-1">
              <Eye size={24} />
              View Score
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// PLAYERS SCREEN
// ============================================================================

function PlayersScreen({ players, setPlayers, onBack, isScorer }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

const addPlayer = async () => {
  if (!newPlayerName.trim()) return;

  const { data, error } = await supabase
    .from('players')
    .insert([{ 
      id: Date.now().toString(),
      name: newPlayerName.trim()
    }])
    .select();

  if (!error && data) {
    setPlayers([...players, data[0]]);
    setNewPlayerName('');
  }
};

  const deletePlayer = async (id) => {
  if (!confirm('Delete this player?')) return;

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);

  if (!error) {
    setPlayers(players.filter(p => p.id !== id));
  }
};

  const startEdit = (player) => {
    setEditingId(player.id);
    setEditName(player.name);
  };

const saveEdit = async () => {
  if (!editName.trim()) return;

  const { error } = await supabase
    .from('players')
    .update({ name: editName.trim() })
    .eq('id', editingId);

  if (!error) {
    setPlayers(players.map(p => 
      p.id === editingId ? { ...p, name: editName.trim() } : p
    ));
    setEditingId(null);
    setEditName('');
  }
};

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Players Data</h2>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          ← Back
        </button>
      </div>

      {/* Add Player */}
      {isScorer && (
  <div className="card">

        <h3 className="text-lg font-semibold mb-4">Add New Player</h3>
        <div className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button onClick={addPlayer} className="btn btn-primary">
            <Plus size={20} /> Add
          </button>
        </div>
      </div>
  )}
      {/* Players List */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          All Players ({players.length})
        </h3>
        
        {players.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No players added yet</p>
        ) : (
          <div className="space-y-2">
            {players.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                {editingId === player.id ? (
                  <>
                    <input
                      type="text"
                      className="input flex-1 mr-3"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="btn btn-primary btn-sm">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn btn-outline btn-sm">
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{player.name}</span>
                    <div className="flex gap-2">
  {isScorer && (
    <>
      <button
        onClick={() => startEdit(player)}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Edit2 size={16} />
      </button>

      <button
        onClick={() => deletePlayer(player.id)}
        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
      >
        <Trash2 size={16} />
      </button>
    </>
  )}
</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MATCH SETUP SCREEN
// ============================================================================

function MatchSetupScreen({ setup, setSetup, players, onComplete, onCancel }) {
  const { step, overs, team1Name, team2Name, team1Players, team2Players, tossWinner, tossDecision } = setup;

  const nextStep = () => {
    setSetup({ ...setup, step: step + 1 });
  };

  const prevStep = () => {
    setSetup({ ...setup, step: step - 1 });
  };

  const updateSetup = (field, value) => {
    setSetup({ ...setup, [field]: value });
  };

  const togglePlayerSelection = (playerId, team) => {
    const field = team === 1 ? 'team1Players' : 'team2Players';
    const currentPlayers = setup[field];
    
    if (currentPlayers.includes(playerId)) {
      updateSetup(field, currentPlayers.filter(id => id !== playerId));
    } else {
      if (currentPlayers.length < 11) {
        updateSetup(field, [...currentPlayers, playerId]);
      }
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return overs && parseInt(overs) > 0;
      case 1: return team1Name.trim().length > 0;
      case 2: return team2Name.trim().length > 0;
      case 3: return team1Players.length >= 2;
      case 4: return team2Players.length >= 2;
      case 5: return tossWinner && tossDecision;
      default: return false;
    }
  };

  const completeSetup = () => {
    const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === team1Name ? team2Name : team1Name);
    const bowlingFirst = battingFirst === team1Name ? team2Name : team1Name;

    const newMatch = {
      id: Date.now().toString(),
      overs: parseInt(overs),
      team1: { name: team1Name, players: team1Players },
      team2: { name: team2Name, players: team2Players },
      toss: { winner: tossWinner, decision: tossDecision },
      battingFirst,
      currentInnings: 1,
      innings: {
        1: {
          battingTeam: battingFirst,
          bowlingTeam: bowlingFirst,
          score: 0,
          wickets: 0,
          balls: 0,
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
          batsmen: {},
          bowlers: {},
          currentBatsmen: { striker: null, nonStriker: null },
          currentBowler: null,
          ballByBall: [],
          fallOfWickets: []
        }
      },
      completed: false,
      startTime: new Date().toISOString()
    };

    onComplete(newMatch);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <div className="card space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Match Setup</h2>
          <button onClick={onCancel} className="btn btn-outline btn-sm">
            Cancel
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-green-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Overs */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Number of Overs</h3>
            <input
              type="number"
              className="input"
              placeholder="Enter number of overs (e.g., 20)"
              value={overs}
              onChange={(e) => updateSetup('overs', e.target.value)}
              min="1"
              max="50"
            />
          </div>
        )}

        {/* Step 1: Team 1 Name */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">First Team Name</h3>
            <input
              type="text"
              className="input"
              placeholder="Enter team name"
              value={team1Name}
              onChange={(e) => updateSetup('team1Name', e.target.value)}
            />
          </div>
        )}

        {/* Step 2: Team 2 Name */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Second Team Name</h3>
            <input
              type="text"
              className="input"
              placeholder="Enter team name"
              value={team2Name}
              onChange={(e) => updateSetup('team2Name', e.target.value)}
            />
          </div>
        )}

        {/* Step 3: Team 1 Players */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">
              Select Players for {team1Name} ({team1Players.length}/11)
            </h3>
            {players.length === 0 ? (
              <p className="text-slate-400">No players available. Add players first.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {players.map(player => (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id, 1)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      team1Players.includes(player.id)
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-400">Select at least 2 players to continue</p>
          </div>
        )}

        {/* Step 4: Team 2 Players */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">
              Select Players for {team2Name} ({team2Players.length}/11)
            </h3>
            {players.length === 0 ? (
              <p className="text-slate-400">No players available. Add players first.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {players.map(player => (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id, 2)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      team2Players.includes(player.id)
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                    disabled={team1Players.includes(player.id)}
                  >
                    {player.name}
                    {team1Players.includes(player.id) && (
                      <span className="text-sm text-slate-400 ml-2">(Already in {team1Name})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-400">Select at least 2 players to continue</p>
          </div>
        )}

        {/* Step 5: Toss */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Who won the toss?</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => updateSetup('tossWinner', team1Name)}
                  className={`flex-1 btn ${
                    tossWinner === team1Name ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {team1Name}
                </button>
                <button
                  onClick={() => updateSetup('tossWinner', team2Name)}
                  className={`flex-1 btn ${
                    tossWinner === team2Name ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {team2Name}
                </button>
              </div>
            </div>

            {tossWinner && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Decision</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateSetup('tossDecision', 'bat')}
                    className={`flex-1 btn ${
                      tossDecision === 'bat' ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    Bat First
                  </button>
                  <button
                    onClick={() => updateSetup('tossDecision', 'bowl')}
                    className={`flex-1 btn ${
                      tossDecision === 'bowl' ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    Bowl First
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={prevStep} className="btn btn-outline">
              ← Previous
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={nextStep}
              className="btn btn-primary flex-1"
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={completeSetup}
              className="btn btn-primary flex-1"
              disabled={!canProceed()}
            >
              Start Match →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCORING SCREEN - The core cricket scoring engine
// ============================================================================

function ScoringScreen({ match, setMatch, onComplete, players })
  const [showBatsmanSelector, setShowBatsmanSelector] = useState(false);
  const [showBowlerSelector, setShowBowlerSelector] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [pendingWicketRuns, setPendingWicketRuns] = useState(0);
  const [lastMatchState, setLastMatchState] = useState(null); // Store previous state for undo

  const currentInnings = match.innings[match.currentInnings];
  const battingTeam = match.currentInnings === 1 ? 
    (currentInnings.battingTeam === match.team1.name ? match.team1 : match.team2) :
    (currentInnings.battingTeam === match.team1.name ? match.team1 : match.team2);
  const bowlingTeam = match.currentInnings === 1 ?
    (currentInnings.bowlingTeam === match.team1.name ? match.team1 : match.team2) :
    (currentInnings.bowlingTeam === match.team1.name ? match.team1 : match.team2);

  // Helper to get player name by ID
  // Players are stored with their IDs in the match, but we need to look up actual names
 const getPlayerName = (playerId) => {
  const player = players.find(p => p.id === playerId);
  return player ? player.name : playerId;
};

  // Initialize batsmen and bowler if not set
  useEffect(() => {
    if (!currentInnings.currentBatsmen.striker || !currentInnings.currentBatsmen.nonStriker) {
      setShowBatsmanSelector(true);
    }
    if (!currentInnings.currentBowler) {
      setShowBowlerSelector(true);
    }
  }, []);

  // Record a ball
  // 
  // MATCH STATE PERSISTENCE STRUCTURE:
  // - All match data is stored in the 'liveMatch' state object
  // - This includes: innings data, batsmen stats, bowler stats, ball-by-ball record
  // - On each ball, the entire match state is cloned, updated, and saved
  // - localStorage automatically persists this for resume functionality
  //
  // EXTRAS CALCULATION LOGIC:
  // - Wide: +1 run to extras, ball does NOT count towards over, no runs to batsman
  // - No Ball: +1 run to extras, ball does NOT count towards over, can have additional runs off bat
  // - Bye/Leg Bye: Runs added to extras, ball COUNTS towards over, no runs to batsman
  // - 'runs' parameter = runs off the bat (or byes/leg byes)
  // - 'extraRuns' parameter = the base extra penalty (1 for wide/no-ball, 0 for bye/leg-bye)
  const recordBall = (runs, isExtra = false, extraType = null, extraRuns = 0, isWicket = false, dismissalType = null, fielder = null) => {
    // Save current state for undo before making changes
    setLastMatchState(JSON.parse(JSON.stringify(match)));
    
    const newMatch = JSON.parse(JSON.stringify(match));
    const innings = newMatch.innings[newMatch.currentInnings];

    let ballCounts = true; // Does this ball count towards the over?
    let runsToAdd = runs; // Runs to add to team score
    let runsToBatsman = runs; // Runs credited to batsman

    // Handle extras
    if (isExtra) {
      if (extraType === 'Wide' || extraType === 'No Ball') {
        // Wide/No-ball: ball doesn't count, +1 extra penalty automatically
        ballCounts = false;
        
        // Add the base penalty (1 run)
        innings.extras[extraType === 'Wide' ? 'wide' : 'noBall'] += extraRuns;
        runsToAdd += extraRuns; // Add penalty to team score
        
        // For Wide: batsman gets no runs
        // For No Ball: batsman gets the runs off bat
        if (extraType === 'Wide') {
          runsToBatsman = 0;
        }
      } else {
        // Bye/Leg-bye: ball counts, runs don't go to batsman
        innings.extras[extraType === 'Bye' ? 'bye' : 'legBye'] += runs;
        runsToBatsman = 0;
      }
    }

    // Update total score
    innings.score += runsToAdd;

    // Update balls (only if ball counts)
    if (ballCounts) {
      innings.balls++;
    }

    // Update batsman stats
    const strikerId = innings.currentBatsmen.striker;
    if (!innings.batsmen[strikerId]) {
      innings.batsmen[strikerId] = {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        out: false,
        dismissal: null
      };
    }

    // Credit runs to batsman (0 for wide/bye/leg-bye, actual runs for no-ball or normal ball)
    innings.batsmen[strikerId].runs += runsToBatsman;
    
    // Count balls faced (only if ball counts)
    if (ballCounts) {
      innings.batsmen[strikerId].balls++;
    }
    
    // Count boundaries (only if runs are credited to batsman)
    if (runsToBatsman === 4) innings.batsmen[strikerId].fours++;
    if (runsToBatsman === 6) innings.batsmen[strikerId].sixes++;
    
    // Update strike rate
    innings.batsmen[strikerId].strikeRate = 
      innings.batsmen[strikerId].balls > 0
        ? (innings.batsmen[strikerId].runs / innings.batsmen[strikerId].balls * 100).toFixed(2)
        : 0;

    // Update bowler stats
    const bowlerId = innings.currentBowler;
    if (!innings.bowlers[bowlerId]) {
      innings.bowlers[bowlerId] = {
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        economy: 0,
        currentOverRuns: 0
      };
    }

    // Bowler stats update (ball counts only if it's a legal delivery)
    if (ballCounts) {
      innings.bowlers[bowlerId].balls++;
    }
    
    // All runs (including extras) are charged to bowler
    innings.bowlers[bowlerId].runs += runsToAdd;
    innings.bowlers[bowlerId].currentOverRuns += runsToAdd;

    // Handle wicket
    if (isWicket) {
      innings.wickets++;
      innings.batsmen[strikerId].out = true;
      innings.batsmen[strikerId].dismissal = {
        type: dismissalType,
        bowler: dismissalType !== 'Run Out' ? bowlerId : null,
        fielder: fielder
      };
      
      // Credit wicket to bowler (except for run outs)
      if (dismissalType !== 'Run Out') {
        innings.bowlers[bowlerId].wickets++;
      }
      
      innings.fallOfWickets.push({
        batsman: strikerId,
        runs: innings.score,
        wicket: innings.wickets,
        over: Math.floor(innings.balls / 6) + (innings.balls % 6) / 10
      });

      // Clear striker - will need to select new batsman
      innings.currentBatsmen.striker = null;
    }

    // Ball by ball record
    innings.ballByBall.push({
      over: Math.floor(innings.balls / 6),
      ball: innings.balls % 6 + 1,
      bowler: bowlerId,
      batsman: strikerId,
      runs,
      isExtra,
      extraType,
      extraRuns,
      isWicket,
      dismissalType,
      totalRuns: runsToAdd
    });

    // Strike rotation (odd runs or wicket)
    // Note: Strike changes on odd runs only if no wicket
    if (!isWicket && (runsToAdd % 2 === 1)) {
      const temp = innings.currentBatsmen.striker;
      innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
      innings.currentBatsmen.nonStriker = temp;
    }

    // Over completion (only if this was a legal delivery)
    if (ballCounts && innings.balls % 6 === 0) {
      // Check for maiden
      if (innings.bowlers[bowlerId].currentOverRuns === 0) {
        innings.bowlers[bowlerId].maidens++;
      }
      innings.bowlers[bowlerId].currentOverRuns = 0;
      innings.bowlers[bowlerId].overs = Math.floor(innings.bowlers[bowlerId].balls / 6);
      
      // Calculate economy
      innings.bowlers[bowlerId].economy = 
        innings.bowlers[bowlerId].overs > 0
          ? (innings.bowlers[bowlerId].runs / innings.bowlers[bowlerId].overs).toFixed(2)
          : 0;

      // Swap strike at end of over
      const temp = innings.currentBatsmen.striker;
      innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
      innings.currentBatsmen.nonStriker = temp;

      // Need to change bowler
      innings.currentBowler = null;
    }

    // Check innings end
    const totalBalls = newMatch.overs * 6;
    const allOut = innings.wickets >= battingTeam.players.length - 1;
    const oversComplete = innings.balls >= totalBalls;

    if (allOut || oversComplete) {
      // Check if match is complete
      if (newMatch.currentInnings === 1) {
        // Start second innings
        const team1Batting = innings.battingTeam === newMatch.team1.name;
        newMatch.currentInnings = 2;
        newMatch.innings[2] = {
          battingTeam: team1Batting ? newMatch.team2.name : newMatch.team1.name,
          bowlingTeam: team1Batting ? newMatch.team1.name : newMatch.team2.name,
          target: innings.score + 1,
          score: 0,
          wickets: 0,
          balls: 0,
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
          batsmen: {},
          bowlers: {},
          currentBatsmen: { striker: null, nonStriker: null },
          currentBowler: null,
          ballByBall: [],
          fallOfWickets: []
        };
      } else {
        // Match complete
        newMatch.completed = true;
        newMatch.endTime = new Date().toISOString();
        
        // Determine winner
        const innings1Score = newMatch.innings[1].score;
        const innings2Score = newMatch.innings[2].score;
        
        if (innings2Score > innings1Score) {
          newMatch.winner = newMatch.innings[2].battingTeam;
          newMatch.margin = {
            type: 'wickets',
            value: battingTeam.players.length - 1 - newMatch.innings[2].wickets
          };
        } else if (innings1Score > innings2Score) {
          newMatch.winner = newMatch.innings[1].battingTeam;
          newMatch.margin = {
            type: 'runs',
            value: innings1Score - innings2Score
          };
        } else {
          newMatch.winner = 'Tie';
        }
        
        // Move to completed matches and clear active match
        setMatch(newMatch);
        onComplete(newMatch);
        return;
      }
    }

    // Save updated match state (will auto-persist to localStorage)
    setMatch(newMatch);
  };

  // Undo last ball
  const undoLastBall = () => {
    if (!lastMatchState) {
      alert('No action to undo');
      return;
    }
    
    if (confirm('Undo the last ball?')) {
      setMatch(lastMatchState);
      setLastMatchState(null); // Clear undo state after restoring
    }
  };

  // Quick run buttons
  const quickRun = (runs) => {
    recordBall(runs);
  };

  // Four
  const recordFour = () => {
    recordBall(4);
  };

  // Six
  const recordSix = () => {
    recordBall(6);
  };

  // Wicket
  const initiateWicket = (runs = 0) => {
    setPendingWicketRuns(runs);
    setShowWicketModal(true);
  };

  const confirmWicket = (dismissalType, fielder = null) => {
    recordBall(pendingWicketRuns, false, null, true, dismissalType, fielder);
    setShowWicketModal(false);
    setPendingWicketRuns(0);
    setShowBatsmanSelector(true);
  };

  // Extra
  const initiateExtra = () => {
    setShowExtraModal(true);
  };

  const confirmExtra = (extraType, additionalRuns) => {
    // Wide and No Ball: base penalty is 1 run + additional runs
    // Bye and Leg Bye: only the runs selected (no base penalty)
    if (extraType === 'Wide' || extraType === 'No Ball') {
      // Base penalty: 1 run for wide/no-ball
      // additionalRuns: runs off the bat (for no-ball) or extra runs taken
      recordBall(additionalRuns, true, extraType, 1);
    } else {
      // Bye/Leg Bye: just the runs, no base penalty
      recordBall(additionalRuns, true, extraType, 0);
    }
    setShowExtraModal(false);
  };

  // Select batsmen
  const selectBatsman = (playerId, position) => {
    const newMatch = JSON.parse(JSON.stringify(match));
    const innings = newMatch.innings[newMatch.currentInnings];
    
    if (position === 'striker') {
      innings.currentBatsmen.striker = playerId;
    } else {
      innings.currentBatsmen.nonStriker = playerId;
    }

    // If both selected, close modal
    if (innings.currentBatsmen.striker && innings.currentBatsmen.nonStriker) {
      setShowBatsmanSelector(false);
    }

    setMatch(newMatch);
  };

  // Select bowler
  const selectBowler = (playerId) => {
    const newMatch = JSON.parse(JSON.stringify(match));
    newMatch.innings[newMatch.currentInnings].currentBowler = playerId;
    setMatch(newMatch);
    setShowBowlerSelector(false);
  };

  // Available batsmen (not out yet and not currently batting)
  const availableBatsmen = battingTeam.players.filter(pid => {
    const batsmanStats = currentInnings.batsmen[pid];
    return !batsmanStats || !batsmanStats.out;
  }).filter(pid => 
    pid !== currentInnings.currentBatsmen.striker && 
    pid !== currentInnings.currentBatsmen.nonStriker
  );

  // Available bowlers
  const availableBowlers = bowlingTeam.players.filter(pid => pid !== currentInnings.currentBowler);

  // Get current over balls
  const getCurrentOver = () => {
    const currentOverBalls = currentInnings.ballByBall.filter(
      b => b.over === Math.floor(currentInnings.balls / 6)
    );
    return currentOverBalls;
  };

  const striker = currentInnings.currentBatsmen.striker;
  const nonStriker = currentInnings.currentBatsmen.nonStriker;
  const bowler = currentInnings.currentBowler;

  const strikerStats = striker ? currentInnings.batsmen[striker] : null;
  const nonStrikerStats = nonStriker ? currentInnings.batsmen[nonStriker] : null;
  const bowlerStats = bowler ? currentInnings.bowlers[bowler] : null;

  const currentOver = Math.floor(currentInnings.balls / 6);
  const currentBall = currentInnings.balls % 6;
  const overDisplay = `${currentOver}.${currentBall}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Header with Undo Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Live Scoring</h3>
        <button
          onClick={undoLastBall}
          disabled={!lastMatchState}
          className={`btn btn-sm ${lastMatchState ? 'btn-outline' : 'btn-outline opacity-50 cursor-not-allowed'}`}
          title="Undo last ball"
        >
          ↶ Undo
        </button>
      </div>

      {/* Score Display */}
      <div className="card">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-green-400">
            {currentInnings.battingTeam}
          </h2>
          <div className="score-display">
            {currentInnings.score}/{currentInnings.wickets}
          </div>
          <div className="font-mono text-xl text-slate-400">
            Overs: {overDisplay} / {match.overs}
          </div>
          {match.currentInnings === 2 && (
            <div className="text-lg text-blue-400">
              Target: {currentInnings.target} | Need {currentInnings.target - currentInnings.score} runs
            </div>
          )}
        </div>
      </div>

      {/* Current Batsmen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-400">★ Striker</h3>
            <button
              onClick={() => setShowBatsmanSelector(true)}
              className="text-sm text-blue-400 hover:underline"
            >
              Change
            </button>
          </div>
          {strikerStats ? (
            <div>
              <p className="text-lg font-bold">{getPlayerName(striker)}</p>
              <p className="font-mono text-sm text-slate-400">
                {strikerStats.runs} ({strikerStats.balls}) • SR: {strikerStats.strikeRate}
              </p>
              <p className="text-xs text-slate-500">
                4s: {strikerStats.fours} | 6s: {strikerStats.sixes}
              </p>
            </div>
          ) : (
            <p className="text-slate-400">Not selected</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Non-Striker</h3>
            <button
              onClick={() => setShowBatsmanSelector(true)}
              className="text-sm text-blue-400 hover:underline"
            >
              Change
            </button>
          </div>
          {nonStrikerStats ? (
            <div>
              <p className="text-lg font-bold">{getPlayerName(nonStriker)}</p>
              <p className="font-mono text-sm text-slate-400">
                {nonStrikerStats.runs} ({nonStrikerStats.balls}) • SR: {nonStrikerStats.strikeRate}
              </p>
              <p className="text-xs text-slate-500">
                4s: {nonStrikerStats.fours} | 6s: {nonStrikerStats.sixes}
              </p>
            </div>
          ) : (
            <p className="text-slate-400">Not selected</p>
          )}
        </div>
      </div>

      {/* Current Bowler */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Current Bowler</h3>
          <button
            onClick={() => setShowBowlerSelector(true)}
            className="text-sm text-blue-400 hover:underline"
          >
            Change
          </button>
        </div>
        {bowlerStats ? (
          <div>
            <p className="text-lg font-bold">{getPlayerName(bowler)}</p>
            <p className="font-mono text-sm text-slate-400">
              {bowlerStats.overs}.{bowlerStats.balls % 6} overs • {bowlerStats.runs} runs • {bowlerStats.wickets} wickets
            </p>
            <p className="text-xs text-slate-500">
              Economy: {bowlerStats.economy} | Maidens: {bowlerStats.maidens}
            </p>
          </div>
        ) : (
          <p className="text-slate-400">Not selected</p>
        )}
      </div>

      {/* This Over */}
      <div className="card">
        <h3 className="font-semibold mb-3">This Over</h3>
        <div className="flex flex-wrap gap-2">
          {getCurrentOver().map((ball, idx) => {
            let displayText = '';
            let bgColor = '';
            
            if (ball.isWicket) {
              displayText = 'W';
              bgColor = 'bg-red-500 text-white';
            } else if (ball.isExtra) {
              // Show extra type with runs
              if (ball.extraType === 'Wide') {
                displayText = ball.runs > 0 ? `${1 + ball.runs}wd` : 'Wd';
              } else if (ball.extraType === 'No Ball') {
                displayText = ball.runs > 0 ? `${1 + ball.runs}nb` : 'Nb';
              } else if (ball.extraType === 'Bye') {
                displayText = `${ball.runs}b`;
              } else {
                displayText = `${ball.runs}lb`;
              }
              bgColor = 'bg-cyan-500 text-white';
            } else if (ball.runs === 4) {
              displayText = '4';
              bgColor = 'bg-orange-500 text-white';
            } else if (ball.runs === 6) {
              displayText = '6';
              bgColor = 'bg-purple-500 text-white';
            } else {
              displayText = ball.runs.toString();
              bgColor = 'bg-slate-600 text-white';
            }
            
            return (
              <div
                key={idx}
                className={`min-w-[40px] h-10 px-2 rounded-full flex items-center justify-center text-xs font-bold ${bgColor}`}
              >
                {displayText}
              </div>
            );
          })}
          {getCurrentOver().length === 0 && (
            <p className="text-slate-400 text-sm">No balls bowled yet</p>
          )}
        </div>
      </div>

      {/* Scoring Buttons */}
      <div className="card">
        <h3 className="font-semibold mb-4">Record Ball</h3>
        
        {/* Runs */}
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">Runs</p>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={() => quickRun(0)} className="ball-button ball-runs">0</button>
            <button onClick={() => quickRun(1)} className="ball-button ball-runs">1</button>
            <button onClick={() => quickRun(2)} className="ball-button ball-runs">2</button>
            <button onClick={() => quickRun(3)} className="ball-button ball-runs">3</button>
          </div>
        </div>

        {/* Boundaries */}
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">Boundaries</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={recordFour} className="ball-button ball-four">4</button>
            <button onClick={recordSix} className="ball-button ball-six">6</button>
          </div>
        </div>

        {/* Wicket & Extras */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => initiateWicket(0)} className="ball-button ball-wicket">
            W
          </button>
          <button onClick={initiateExtra} className="ball-button ball-extra">
            Extra
          </button>
        </div>
      </div>

      {/* Batsman Selector Modal */}
      {showBatsmanSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Select Batsmen</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Striker</p>
                <div className="space-y-2">
                  {availableBatsmen.map(pid => (
                    <button
                      key={pid}
                      onClick={() => selectBatsman(pid, 'striker')}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        striker === pid
                          ? 'bg-green-500/20 border-2 border-green-500'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {getPlayerName(pid)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-2">Non-Striker</p>
                <div className="space-y-2">
                  {availableBatsmen.map(pid => (
                    <button
                      key={pid}
                      onClick={() => selectBatsman(pid, 'nonStriker')}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        nonStriker === pid
                          ? 'bg-green-500/20 border-2 border-green-500'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {getPlayerName(pid)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {striker && nonStriker && (
              <button
                onClick={() => setShowBatsmanSelector(false)}
                className="w-full btn btn-primary mt-4"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bowler Selector Modal */}
      {showBowlerSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Select Bowler</h3>
            
            <div className="space-y-2">
              {availableBowlers.map(pid => (
                <button
                  key={pid}
                  onClick={() => selectBowler(pid)}
                  className="w-full p-3 rounded-lg text-left bg-white/5 hover:bg-white/10 transition-all"
                >
                  {getPlayerName(pid)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Dismissal Type</h3>
            
            <div className="space-y-2">
              {DISMISSAL_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => confirmWicket(type)}
                  className="w-full p-3 rounded-lg text-left bg-white/5 hover:bg-white/10 transition-all"
                >
                  {type}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowWicketModal(false)}
              className="w-full btn btn-outline mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Extra Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">Extra Type</h3>
            <p className="text-sm text-slate-400 mb-4">
              Wide/No Ball: +1 run penalty + additional runs<br/>
              Bye/Leg Bye: Only the runs shown
            </p>
            
            <div className="space-y-4">
              {/* Wide */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-cyan-400">Wide (+1 + extra runs)</p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map(runs => (
                    <button
                      key={runs}
                      onClick={() => confirmExtra('Wide', runs)}
                      className="flex-1 btn btn-outline btn-sm"
                      title={`Total: ${1 + runs} runs`}
                    >
                      {runs === 0 ? 'Wd' : `Wd+${runs}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* No Ball */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-cyan-400">No Ball (+1 + runs off bat)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 6].map(runs => (
                    <button
                      key={runs}
                      onClick={() => confirmExtra('No Ball', runs)}
                      className="btn btn-outline btn-sm"
                      title={`Total: ${1 + runs} runs`}
                    >
                      {runs === 0 ? 'NB' : `NB+${runs}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bye */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-300">Bye</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(runs => (
                    <button
                      key={runs}
                      onClick={() => confirmExtra('Bye', runs)}
                      className="flex-1 btn btn-outline btn-sm"
                    >
                      {runs}B
                    </button>
                  ))}
                </div>
              </div>

              {/* Leg Bye */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-300">Leg Bye</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(runs => (
                    <button
                      key={runs}
                      onClick={() => confirmExtra('Leg Bye', runs)}
                      className="flex-1 btn btn-outline btn-sm"
                    >
                      {runs}LB
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowExtraModal(false)}
              className="w-full btn btn-outline mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW SCREEN (Read-only)
// ============================================================================

function ViewScreen({ match, onBack, players }) {
  if (!match) {
    return (
      <div className="text-center py-20 animate-in">
        <p className="text-2xl text-slate-400 mb-4">No live match</p>
        <button onClick={onBack} className="btn btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const currentInnings = match.innings[match.currentInnings];
  
  // Helper to get player name by ID
  const getPlayerName = (playerId) => {
  const player = players.find(p => p.id === playerId);
  return player ? player.name : playerId;
};
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Live Match</h2>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          ← Back
        </button>
      </div>

      {/* Score Display */}
      <div className="card text-center">
        <h3 className="text-2xl font-bold text-green-400 mb-4">
          {currentInnings.battingTeam}
        </h3>
        <div className="score-display mb-4">
          {currentInnings.score}/{currentInnings.wickets}
        </div>
        <div className="font-mono text-xl text-slate-400">
          Overs: {Math.floor(currentInnings.balls / 6)}.{currentInnings.balls % 6} / {match.overs}
        </div>
        {match.currentInnings === 2 && (
          <div className="text-lg text-blue-400 mt-2">
            Target: {currentInnings.target} | Need {currentInnings.target - currentInnings.score} runs
          </div>
        )}
      </div>

      {/* Batsmen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentInnings.currentBatsmen.striker && (
          <div className="card">
            <h4 className="font-semibold text-green-400 mb-2">★ Striker</h4>
            <p className="text-lg font-bold">{getPlayerName(currentInnings.currentBatsmen.striker)}</p>
            {currentInnings.batsmen[currentInnings.currentBatsmen.striker] && (
              <>
                <p className="font-mono text-sm text-slate-400">
                  {currentInnings.batsmen[currentInnings.currentBatsmen.striker].runs} (
                  {currentInnings.batsmen[currentInnings.currentBatsmen.striker].balls})
                </p>
                <p className="text-xs text-slate-500">
                  SR: {currentInnings.batsmen[currentInnings.currentBatsmen.striker].strikeRate} • 
                  4s: {currentInnings.batsmen[currentInnings.currentBatsmen.striker].fours} • 
                  6s: {currentInnings.batsmen[currentInnings.currentBatsmen.striker].sixes}
                </p>
              </>
            )}
          </div>
        )}

        {currentInnings.currentBatsmen.nonStriker && (
          <div className="card">
            <h4 className="font-semibold mb-2">Non-Striker</h4>
            <p className="text-lg font-bold">{getPlayerName(currentInnings.currentBatsmen.nonStriker)}</p>
            {currentInnings.batsmen[currentInnings.currentBatsmen.nonStriker] && (
              <>
                <p className="font-mono text-sm text-slate-400">
                  {currentInnings.batsmen[currentInnings.currentBatsmen.nonStriker].runs} (
                  {currentInnings.batsmen[currentInnings.currentBatsmen.nonStriker].balls})
                </p>
                <p className="text-xs text-slate-500">
                  SR: {currentInnings.batsmen[currentInnings.currentBatsmen.nonStriker].strikeRate} • 
                  4s: {currentInnings.batsmen[currentInnings.currentBatsmen.nonStriker].fours} • 
                  6s: {currentInnings.batsmen[currentInnings.currentBatsmen.nonStriker].sixes}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bowler */}
      {currentInnings.currentBowler && (
        <div className="card">
          <h4 className="font-semibold mb-2">Current Bowler</h4>
          <p className="text-lg font-bold">{getPlayerName(currentInnings.currentBowler)}</p>
          {currentInnings.bowlers[currentInnings.currentBowler] && (
            <>
              <p className="font-mono text-sm text-slate-400">
                {currentInnings.bowlers[currentInnings.currentBowler].overs}.
                {currentInnings.bowlers[currentInnings.currentBowler].balls % 6} overs • 
                {currentInnings.bowlers[currentInnings.currentBowler].runs} runs • 
                {currentInnings.bowlers[currentInnings.currentBowler].wickets} wickets
              </p>
              <p className="text-xs text-slate-500">
                Economy: {currentInnings.bowlers[currentInnings.currentBowler].economy} • 
                Maidens: {currentInnings.bowlers[currentInnings.currentBowler].maidens}
              </p>
            </>
          )}
        </div>
      )}

      <p className="text-center text-slate-400 text-sm">
        This is a read-only view. Scores update automatically.
      </p>
    </div>
  );
}

// ============================================================================
// STATS SCREEN
// ============================================================================

function StatsScreen({ matches, players, onBack }) {
  // Helper to get player name by ID
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : playerId;
  };

  // Calculate cumulative stats
  const calculateStats = () => {
    const playerStats = {};

    matches.forEach(match => {
      [1, 2].forEach(inningsNum => {
        const innings = match.innings[inningsNum];
        if (!innings) return;

        // Batting stats
        Object.entries(innings.batsmen).forEach(([playerId, stats]) => {
          if (!playerStats[playerId]) {
            playerStats[playerId] = {
              id: playerId,
              name: getPlayerName(playerId),
              matches: 0,
              runs: 0,
              wickets: 0,
              catches: 0,
              runOuts: 0
            };
          }
          playerStats[playerId].runs += stats.runs;
        });

        // Bowling stats
        Object.entries(innings.bowlers).forEach(([playerId, stats]) => {
          if (!playerStats[playerId]) {
            playerStats[playerId] = {
              id: playerId,
              name: getPlayerName(playerId),
              matches: 0,
              runs: 0,
              wickets: 0,
              catches: 0,
              runOuts: 0
            };
          }
          playerStats[playerId].wickets += stats.wickets;
        });
      });
    });

    // Count matches per player
    matches.forEach(match => {
      const allPlayersInMatch = [...match.team1.players, ...match.team2.players];
      allPlayersInMatch.forEach(playerId => {
        if (playerStats[playerId]) {
          playerStats[playerId].matches++;
        }
      });
    });

    return Object.values(playerStats);
  };

  const stats = calculateStats();
  const topBatsmen = [...stats].sort((a, b) => b.runs - a.runs).slice(0, 10);
  const topBowlers = [...stats].sort((a, b) => b.wickets - a.wickets).slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Statistics</h2>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          ← Back
        </button>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-2">Overview</h3>
        <p className="text-slate-400">Total Matches: {matches.length}</p>
      </div>

      {/* Top Batsmen */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Top Batsmen</h3>
        {topBatsmen.length === 0 ? (
          <p className="text-slate-400">No data available</p>
        ) : (
          <div className="space-y-2">
            {topBatsmen.map((player, idx) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-green-400">#{idx + 1}</span>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="text-sm text-slate-400">{player.matches} matches</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold">{player.runs}</p>
                  <p className="text-xs text-slate-400">runs</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Bowlers */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Top Bowlers</h3>
        {topBowlers.length === 0 ? (
          <p className="text-slate-400">No data available</p>
        ) : (
          <div className="space-y-2">
            {topBowlers.map((player, idx) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-blue-400">#{idx + 1}</span>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="text-sm text-slate-400">{player.matches} matches</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold">{player.wickets}</p>
                  <p className="text-xs text-slate-400">wickets</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MATCH COMPLETE SCREEN
// ============================================================================

function MatchCompleteScreen({ match, onHome }) {
  const innings1 = match.innings[1];
  const innings2 = match.innings[2];

  // Helper to get player name by ID
  const getPlayerName = (playerId) => {
  const player = players.find(p => p.id === playerId);
  return player ? player.name : playerId;
};

  // Find top performers
  const allBatsmen = { ...innings1.batsmen, ...innings2.batsmen };
  const allBowlers = { ...innings1.bowlers, ...innings2.bowlers };

  const topBatsman = Object.entries(allBatsmen).reduce((max, [id, stats]) => 
    stats.runs > (max.stats?.runs || 0) ? { id, stats } : max, 
    {}
  );

  const topBowler = Object.entries(allBowlers).reduce((max, [id, stats]) => 
    stats.wickets > (max.stats?.wickets || 0) ? { id, stats } : max,
    {}
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="card text-center">
        <h2 className="text-3xl font-bold mb-6">🏆 Match Complete!</h2>
        
        <div className="space-y-4">
          {match.winner !== 'Tie' ? (
            <>
              <p className="text-2xl font-bold text-green-400">{match.winner} won!</p>
              <p className="text-lg text-slate-300">
                by {match.margin.value} {match.margin.type}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-yellow-400">Match Tied!</p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">{innings1.battingTeam}</p>
              <p className="text-2xl font-mono font-bold">
                {innings1.score}/{innings1.wickets}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">{innings2.battingTeam}</p>
              <p className="text-2xl font-mono font-bold">
                {innings2.score}/{innings2.wickets}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Top Performers</h3>
        
        <div className="space-y-3">
          {topBatsman.id && (
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-slate-400">Top Batsman</p>
              <p className="font-bold text-lg">{getPlayerName(topBatsman.id)}</p>
              <p className="font-mono text-green-400">
                {topBatsman.stats.runs} runs ({topBatsman.stats.balls} balls)
              </p>
            </div>
          )}

          {topBowler.id && (
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-slate-400">Top Bowler</p>
              <p className="font-bold text-lg">{getPlayerName(topBowler.id)}</p>
              <p className="font-mono text-blue-400">
                {topBowler.stats.wickets} wickets
              </p>
            </div>
          )}
        </div>
      </div>

      <button onClick={onHome} className="w-full btn btn-primary btn-lg">
        Back to Home
      </button>
    </div>
  );
}
