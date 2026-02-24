/**
 * Child Development Milestones Database
 * Based on WHO and CDC guidelines
 */

export const milestoneCategories = [
  { id: 'physical', name: 'Physical Development', icon: '🏃', color: '#4CAF50' },
  { id: 'cognitive', name: 'Cognitive Development', icon: '🧠', color: '#2196F3' },
  { id: 'social', name: 'Social & Emotional', icon: '❤️', color: '#FF5722' },
  { id: 'language', name: 'Language & Communication', icon: '💬', color: '#9C27B0' },
];

export const milestonesByAge = {
  // 2-3 months
  '2-3': [
    { category: 'physical', milestone: 'Lifts head when on tummy', critical: true },
    { category: 'physical', milestone: 'Moves both arms and legs' },
    { category: 'social', milestone: 'Smiles at people', critical: true },
    { category: 'social', milestone: 'Can calm down when spoken to or picked up' },
    { category: 'language', milestone: 'Makes cooing sounds', critical: true },
    { category: 'cognitive', milestone: 'Watches you as you move' },
  ],
  
  // 4-6 months
  '4-6': [
    { category: 'physical', milestone: 'Rolls over (front to back)', critical: true },
    { category: 'physical', milestone: 'Holds head steady without support' },
    { category: 'physical', milestone: 'Sits with support' },
    { category: 'social', milestone: 'Laughs', critical: true },
    { category: 'social', milestone: 'Enjoys playing with others' },
    { category: 'language', milestone: 'Babbles with expression', critical: true },
    { category: 'cognitive', milestone: 'Reaches for toys' },
    { category: 'cognitive', milestone: 'Recognizes familiar people' },
  ],

  // 9 months
  '9': [
    { category: 'physical', milestone: 'Sits without support', critical: true },
    { category: 'physical', milestone: 'Pulls to stand' },
    { category: 'physical', milestone: 'Picks things up with thumb and finger' },
    { category: 'social', milestone: 'Is shy around strangers' },
    { category: 'social', milestone: 'Copies sounds and gestures' },
    { category: 'language', milestone: 'Says "mama" and "dada"', critical: true },
    { category: 'cognitive', milestone: 'Looks for things they see you hide' },
    { category: 'cognitive', milestone: 'Plays peek-a-boo' },
  ],

  // 12 months (1 year)
  '12': [
    { category: 'physical', milestone: 'Stands alone', critical: true },
    { category: 'physical', milestone: 'Takes a few steps without holding on' },
    { category: 'physical', milestone: 'Drinks from a cup' },
    { category: 'social', milestone: 'Cries when mom or dad leaves' },
    { category: 'social', milestone: 'Shows fear in some situations' },
    { category: 'language', milestone: 'Says several single words', critical: true },
    { category: 'language', milestone: 'Waves bye-bye' },
    { category: 'cognitive', milestone: 'Finds hidden objects' },
  ],

  // 18 months
  '18': [
    { category: 'physical', milestone: 'Walks alone', critical: true },
    { category: 'physical', milestone: 'Climbs stairs with help' },
    { category: 'physical', milestone: 'Eats with a spoon' },
    { category: 'social', milestone: 'Copies what others do' },
    { category: 'social', milestone: 'Shows affection to familiar people' },
    { category: 'language', milestone: 'Says at least 10 words', critical: true },
    { category: 'language', milestone: 'Points to show something interesting' },
    { category: 'cognitive', milestone: 'Knows what ordinary things are for' },
    { category: 'cognitive', milestone: 'Scribbles on paper' },
  ],

  // 2 years
  '24': [
    { category: 'physical', milestone: 'Kicks a ball', critical: true },
    { category: 'physical', milestone: 'Runs' },
    { category: 'physical', milestone: 'Walks up and down stairs' },
    { category: 'social', milestone: 'Gets excited around other children' },
    { category: 'social', milestone: 'Copies adults and friends' },
    { category: 'language', milestone: 'Says sentences with 2-4 words', critical: true },
    { category: 'language', milestone: 'Points to things in a book' },
    { category: 'cognitive', milestone: 'Sorts shapes and colors' },
    { category: 'cognitive', milestone: 'Builds towers of 4+ blocks' },
  ],

  // 3 years
  '36': [
    { category: 'physical', milestone: 'Climbs well', critical: true },
    { category: 'physical', milestone: 'Pedals a tricycle' },
    { category: 'physical', milestone: 'Dresses and undresses self' },
    { category: 'social', milestone: 'Shows affection for friends' },
    { category: 'social', milestone: 'Takes turns in games' },
    { category: 'language', milestone: 'Speaks in sentences of 5+ words', critical: true },
    { category: 'language', milestone: 'Tells stories' },
    { category: 'cognitive', milestone: 'Works toys with buttons and moving parts' },
    { category: 'cognitive', milestone: 'Plays make-believe' },
  ],

  // 4 years
  '48': [
    { category: 'physical', milestone: 'Hops and stands on one foot', critical: true },
    { category: 'physical', milestone: 'Catches a bounced ball most of the time' },
    { category: 'physical', milestone: 'Pours and cuts with supervision' },
    { category: 'social', milestone: 'Cooperates with other children' },
    { category: 'social', milestone: 'Understands "mine" and "theirs"' },
    { category: 'language', milestone: 'Says first and last name', critical: true },
    { category: 'language', milestone: 'Sings songs from memory' },
    { category: 'cognitive', milestone: 'Names colors and numbers' },
    { category: 'cognitive', milestone: 'Draws a person with 2-4 body parts' },
  ],

  // 5 years
  '60': [
    { category: 'physical', milestone: 'Stands on one foot for 10+ seconds', critical: true },
    { category: 'physical', milestone: 'Swings and climbs' },
    { category: 'physical', milestone: 'Uses toilet independently' },
    { category: 'social', milestone: 'Wants to please friends' },
    { category: 'social', milestone: 'Aware of gender' },
    { category: 'language', milestone: 'Speaks clearly', critical: true },
    { category: 'language', milestone: 'Tells a simple story' },
    { category: 'cognitive', milestone: 'Counts 10+ things' },
    { category: 'cognitive', milestone: 'Draws recognizable pictures' },
  ],
};

/**
 * Get appropriate milestones for child's age in months
 */
export const getMilestonesForAge = (ageInMonths) => {
  if (ageInMonths < 2) return [];
  if (ageInMonths <= 3) return milestonesByAge['2-3'];
  if (ageInMonths <= 6) return milestonesByAge['4-6'];
  if (ageInMonths <= 11) return milestonesByAge['9'];
  if (ageInMonths <= 17) return milestonesByAge['12'];
  if (ageInMonths <= 23) return milestonesByAge['18'];
  if (ageInMonths <= 35) return milestonesByAge['24'];
  if (ageInMonths <= 47) return milestonesByAge['36'];
  if (ageInMonths <= 59) return milestonesByAge['48'];
  return milestonesByAge['60'];
};

/**
 * Calculate age in months from date of birth
 */
export const calculateAgeInMonths = (dateOfBirth) => {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                 (now.getMonth() - birth.getMonth());
  return months;
};

/**
 * Suggested activities to help development
 */
export const developmentActivities = {
  physical: [
    'Tummy time daily',
    'Play catch with soft balls',
    'Climbing playground equipment',
    'Dancing to music',
    'Obstacle courses',
    'Riding tricycle or bike',
  ],
  cognitive: [
    'Reading books together',
    'Sorting games (shapes, colors)',
    'Simple puzzles',
    'Memory card games',
    'Counting toys and objects',
    'Building with blocks',
  ],
  social: [
    'Playdates with peers',
    'Role-playing games',
    'Sharing activities',
    'Group circle time',
    'Emotion cards and discussions',
    'Family meals together',
  ],
  language: [
    'Reading aloud daily',
    'Singing songs together',
    'Asking open-ended questions',
    'Narrating daily activities',
    'Rhyming games',
    'Storytelling',
  ],
};
