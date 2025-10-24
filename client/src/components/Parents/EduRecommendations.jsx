import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, Typography, Chip, Box, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';

// Lightweight AI-like education recommender for a child
// Uses child's age, program, recent activities and preferences (if present)
function computeAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function makeRecommendations({ profile, activities = [], milestones = [] }) {
  const age = computeAge(profile?.dateOfBirth);
  const program = (profile?.program || '').toLowerCase();
  const interests = new Set(
    (activities || [])
      .map((a) => (a.tags || [])).flat()
      .concat(profile?.interests || [])
      .map((t) => String(t).toLowerCase())
  );

  // Base catalog of learning ideas
  const catalog = [
    { key: 'phonics', title: 'Phonics Fun Pack', desc: 'Letter sounds, blending games and early reading practice.', age: [3,6], tags: ['literacy','reading','phonics'], minutes: 15 },
    { key: 'counting', title: 'Number Sense Quest', desc: 'Counting, shapes and simple math with manipulatives.', age: [3,7], tags: ['math','counting','shapes'], minutes: 15 },
    { key: 'science', title: 'Mini Scientists', desc: 'Hands-on experiments: sink/float, magnets, colors.', age: [4,8], tags: ['science','experiments','stem'], minutes: 20 },
    { key: 'fine-motor', title: 'Fine Motor Lab', desc: 'Tracing, threading, clay pinching for writing readiness.', age: [3,6], tags: ['motor','writing','prewriting'], minutes: 10 },
    { key: 'story', title: 'Story Time Prompts', desc: 'Picture prompts to spark narration and vocabulary.', age: [3,8], tags: ['language','vocabulary','story'], minutes: 10 },
    { key: 'gross-motor', title: 'Move & Balance', desc: 'Gross motor circuits: hop, balance, crawl, toss.', age: [3,8], tags: ['movement','gross-motor','physical'], minutes: 10 },
    { key: 'coding', title: 'Code with Blocks', desc: 'Beginner block coding puzzles (no reading required).', age: [5,10], tags: ['coding','logic','problem-solving'], minutes: 15 },
  ];

  // Filter catalog by age range
  const byAge = (item) => {
    if (age == null) return true; // unknown age, allow all
    const [min, max] = item.age;
    return age >= min && age <= max;
  };

  // Score by interest overlap + program match + milestone gaps
  const programTags = new Set([program]);
  const gapTags = new Set(
    (milestones || [])
      .filter((m) => m?.status === 'upcoming' || m?.status === 'pending')
      .map((m) => String(m?.area || '').toLowerCase())
  );

  function score(item) {
    const itemTags = new Set(item.tags.map(String));
    let s = 0;
    for (const t of itemTags) {
      if (interests.has(t)) s += 1.2;
      if (programTags.has(t)) s += 0.5;
      if (gapTags.has(t)) s += 0.8; // gently push areas with upcoming goals
    }
    // small boost for shorter activities for younger kids
    if (age != null && age <= 4 && item.minutes <= 12) s += 0.3;
    return s;
  }

  const list = catalog.filter(byAge).map((it) => ({ ...it, score: score(it) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 6);
  return list;
}

export default function EduRecommendations({ profile, activities = [], milestones = [] }) {
  const recs = useMemo(() => makeRecommendations({ profile, activities, milestones }), [profile, activities, milestones]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null); // { key, title, desc, minutes, tags }

  // Simple details per activity key
  const details = {
    phonics: {
      materials: ['Letter cards', 'Magnetic letters', '2-3 short CVC words'],
      steps: ['Warm-up: Say the letter sounds', 'Blend: Pick 3 letters and blend into a word', 'Game: Find objects that start with the sound'],
    },
    counting: {
      materials: ['Buttons/blocks (20)', 'Shape cut-outs'],
      steps: ['Count 1–10 with objects', 'Sort by shape/color', 'Trace basic shapes'],
    },
    science: {
      materials: ['Bowl of water', 'Small objects', 'Magnet (optional)'],
      steps: ['Predict: Will it sink or float?', 'Test items and talk about results', 'Try color mixing with food colors'],
    },
    'fine-motor': {
      materials: ['Thread and beads', 'Playdough', 'Crayons'],
      steps: ['Thread 10 beads', 'Pinch-roll playdough snakes', 'Trace simple lines and curves'],
    },
    story: {
      materials: ['Picture book or prompt cards'],
      steps: ['Describe what you see', 'Make up a beginning–middle–end', 'Act out a character voice'],
    },
    'gross-motor': {
      materials: ['Tape for floor line', 'Soft balls'],
      steps: ['Balance-walk on a line', 'Hop 10 times', 'Throw and catch gently'],
    },
    coding: {
      materials: ['Tablet/PC with block coding site', 'Simple maze puzzles'],
      steps: ['Drag blocks to move character', 'Run and debug', 'Create a new small puzzle'],
    },
  };

  return (
    <Card>
      <CardHeader title="AI Education Recommendations" subheader="Personalized learning ideas based on age, program and activity interests" />
      <CardContent>
        {recs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No recommendations yet.</Typography>
        ) : (
          <Grid container spacing={2}>
            {recs.map((r) => (
              <Grid item xs={12} md={6} key={r.key}>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" fontWeight={700}>{r.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.desc}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {r.tags.map((t) => (<Chip key={t} label={t} size="small" />))}
                    <Chip size="small" color="primary" variant="outlined" label={`${r.minutes} min`} />
                  </Box>
                  <Box sx={{ mt: 1.25 }}>
                    <Button size="small" variant="contained" onClick={() => { setActive(r); setOpen(true); }}>View Activity</Button>
                    <Button size="small" sx={{ ml: 1 }} variant="text" onClick={() => alert('Saved! (wire to backend if needed)')}>Save</Button>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
      {/* Details Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{active?.title || 'Activity'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {active?.desc}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Materials</Typography>
          <List dense>
            {(details[active?.key]?.materials || ['Common household items']).map((m, i) => (
              <ListItem key={i} sx={{ py: 0 }}>
                <ListItemText primary={m} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Steps</Typography>
          <List dense>
            {(details[active?.key]?.steps || ['Follow the instructions shown in class.']).map((s, i) => (
              <ListItem key={i} sx={{ py: 0 }}>
                <ListItemText primary={`${i + 1}. ${s}`} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { alert('Marked as done!'); setOpen(false); }}>Mark Done</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
