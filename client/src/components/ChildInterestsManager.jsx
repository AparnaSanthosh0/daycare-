import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { AlertCircle, Save, Plus, X, Heart } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

const ChildInterestsManager = ({ child, onSave, onClose }) => {
  const [interests, setInterests] = useState([]);
  const [activityPreferences, setActivityPreferences] = useState([]);
  const [socialPreferences, setSocialPreferences] = useState({
    groupSize: 'medium',
    interactionStyle: 'mixed',
    leadershipTendency: 'neutral'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const availableInterests = [
    'arts_crafts', 'music', 'dancing', 'reading', 'outdoor_play',
    'building_blocks', 'puzzles', 'sports', 'cooking', 'science',
    'storytelling', 'drawing', 'singing', 'running', 'swimming',
    'board_games', 'pretend_play', 'gardening', 'animals', 'technology'
  ];

  const interestLabels = {
    'arts_crafts': 'Arts & Crafts',
    'music': 'Music',
    'dancing': 'Dancing',
    'reading': 'Reading',
    'outdoor_play': 'Outdoor Play',
    'building_blocks': 'Building Blocks',
    'puzzles': 'Puzzles',
    'sports': 'Sports',
    'cooking': 'Cooking',
    'science': 'Science',
    'storytelling': 'Storytelling',
    'drawing': 'Drawing',
    'singing': 'Singing',
    'running': 'Running',
    'swimming': 'Swimming',
    'board_games': 'Board Games',
    'pretend_play': 'Pretend Play',
    'gardening': 'Gardening',
    'animals': 'Animals',
    'technology': 'Technology'
  };

  const interestCategories = {
    creative: ['arts_crafts', 'music', 'dancing', 'drawing', 'singing', 'storytelling'],
    physical: ['outdoor_play', 'sports', 'running', 'swimming'],
    cognitive: ['reading', 'puzzles', 'science', 'board_games', 'technology'],
    social: ['pretend_play', 'cooking', 'gardening', 'animals'],
    building: ['building_blocks']
  };

  const categoryLabels = {
    creative: 'Creative Arts',
    physical: 'Physical Activities',
    cognitive: 'Cognitive Skills',
    social: 'Social Interaction',
    building: 'Building & Construction'
  };

  useEffect(() => {
    if (child) {
      setInterests(child.interests || []);
      setActivityPreferences(child.activityPreferences || []);
      setSocialPreferences(child.socialPreferences || {
        groupSize: 'medium',
        interactionStyle: 'mixed',
        leadershipTendency: 'neutral'
      });
    }
  }, [child]);

  const handleInterestToggle = (interest) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleCategoryToggle = (categoryInterests) => {
    const allSelected = categoryInterests.every(interest => interests.includes(interest));
    
    if (allSelected) {
      // Remove all interests from this category
      setInterests(prev => prev.filter(interest => !categoryInterests.includes(interest)));
    } else {
      // Add all interests from this category
      setInterests(prev => {
        const newInterests = [...prev];
        categoryInterests.forEach(interest => {
          if (!newInterests.includes(interest)) {
            newInterests.push(interest);
          }
        });
        return newInterests;
      });
    }
  };

  const addActivityPreference = () => {
    setActivityPreferences(prev => [...prev, {
      activityType: '',
      preferenceLevel: 3,
      lastEngaged: new Date()
    }]);
  };

  const updateActivityPreference = (index, field, value) => {
    setActivityPreferences(prev => prev.map((pref, i) => 
      i === index ? { ...pref, [field]: value } : pref
    ));
  };

  const removeActivityPreference = (index) => {
    setActivityPreferences(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recommendations/update-interests/${child._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interests,
          activityPreferences,
          socialPreferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update child interests');
      }

      setSuccess(true);
      if (onSave) {
        onSave({
          interests,
          activityPreferences,
          socialPreferences
        });
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPreferenceLevelLabel = (level) => {
    const labels = {
      1: 'Not Interested',
      2: 'Somewhat Interested',
      3: 'Neutral',
      4: 'Interested',
      5: 'Very Interested'
    };
    return labels[level] || 'Neutral';
  };

  const getPreferenceLevelColor = (level) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-gray-100 text-gray-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-green-100 text-green-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Child Interests & Preferences</h2>
          <p className="text-gray-600 mt-1">
            Manage interests and preferences for {child?.firstName} {child?.lastName}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Heart className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Child interests updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Interest Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Interest Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(interestCategories).map(([category, categoryInterests]) => {
              const allSelected = categoryInterests.every(interest => interests.includes(interest));
              const someSelected = categoryInterests.some(interest => interests.includes(interest));
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onCheckedChange={() => handleCategoryToggle(categoryInterests)}
                    />
                    <h3 className="font-medium text-lg">{categoryLabels[category]}</h3>
                    <Badge variant="outline">
                      {categoryInterests.filter(interest => interests.includes(interest)).length} / {categoryInterests.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ml-6">
                    {categoryInterests.map((interest) => (
                      <div key={interest} className="flex items-center space-x-2">
                        <Checkbox
                          checked={interests.includes(interest)}
                          onCheckedChange={() => handleInterestToggle(interest)}
                        />
                        <Label className="text-sm">{interestLabels[interest]}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Activity Preferences
            </span>
            <Button onClick={addActivityPreference} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Preference
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityPreferences.length > 0 ? (
            <div className="space-y-4">
              {activityPreferences.map((pref, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Activity Type</Label>
                    <Select 
                      value={pref.activityType} 
                      onValueChange={(value) => updateActivityPreference(index, 'activityType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterests.map((interest) => (
                          <SelectItem key={interest} value={interest}>
                            {interestLabels[interest]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-48">
                    <Label className="text-sm font-medium">Preference Level</Label>
                    <Select 
                      value={pref.preferenceLevel.toString()} 
                      onValueChange={(value) => updateActivityPreference(index, 'preferenceLevel', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Not Interested</SelectItem>
                        <SelectItem value="2">Somewhat Interested</SelectItem>
                        <SelectItem value="3">Neutral</SelectItem>
                        <SelectItem value="4">Interested</SelectItem>
                        <SelectItem value="5">Very Interested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-32">
                    <Label className="text-sm font-medium">Last Engaged</Label>
                    <Input
                      type="date"
                      value={pref.lastEngaged ? new Date(pref.lastEngaged).toISOString().split('T')[0] : ''}
                      onChange={(e) => updateActivityPreference(index, 'lastEngaged', new Date(e.target.value))}
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeActivityPreference(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No activity preferences set yet.</p>
              <p className="text-sm">Click "Add Preference" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Social Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm font-medium">Preferred Group Size</Label>
              <Select 
                value={socialPreferences.groupSize} 
                onValueChange={(value) => setSocialPreferences(prev => ({ ...prev, groupSize: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (2-3 children)</SelectItem>
                  <SelectItem value="medium">Medium (4-5 children)</SelectItem>
                  <SelectItem value="large">Large (6+ children)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Interaction Style</Label>
              <Select 
                value={socialPreferences.interactionStyle} 
                onValueChange={(value) => setSocialPreferences(prev => ({ ...prev, interactionStyle: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiet">Quiet & Calm</SelectItem>
                  <SelectItem value="active">Active & Energetic</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Leadership Tendency</Label>
              <Select 
                value={socialPreferences.leadershipTendency} 
                onValueChange={(value) => setSocialPreferences(prev => ({ ...prev, leadershipTendency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follower">Follower</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Interests Summary */}
      {interests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Interests ({interests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interestLabels[interest]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChildInterestsManager;
