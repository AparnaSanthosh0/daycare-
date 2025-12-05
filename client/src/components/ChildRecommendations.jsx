import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AlertCircle, Users, Heart, Star, Activity, Target } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

const ChildRecommendations = ({ childId, onClose }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [activityRecommendations, setActivityRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [kValue, setKValue] = useState(3);
  const [minGroupSize, setMinGroupSize] = useState(2);
  const [maxGroupSize, setMaxGroupSize] = useState(4);

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

  useEffect(() => {
    if (childId) {
      fetchRecommendations();
    }
  }, [childId, kValue, minGroupSize, maxGroupSize]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        k: kValue,
        minGroupSize: minGroupSize,
        maxGroupSize: maxGroupSize
      });

      const response = await fetch(`/api/recommendations/child/${childId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityRecommendations = async (activityType) => {
    if (!activityType) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recommendations/activity/${childId}?activityType=${activityType}&k=${kValue}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity recommendations');
      }

      const data = await response.json();
      setActivityRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (activity) => {
    setSelectedActivity(activity);
    fetchActivityRecommendations(activity);
  };

  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.8) return 'bg-green-100 text-green-800';
    if (similarity >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSimilarityLabel = (similarity) => {
    if (similarity >= 0.8) return 'High';
    if (similarity >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading && !recommendations) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading recommendations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Child Grouping Recommendations</h2>
          {recommendations && (
            <p className="text-gray-600 mt-1">
              Recommendations for {recommendations.targetChild.name} (Age: {recommendations.targetChild.age} years)
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recommendation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Neighbors (K)
              </label>
              <Select value={kValue.toString()} onValueChange={(value) => setKValue(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Group Size
              </label>
              <Select value={minGroupSize.toString()} onValueChange={(value) => setMinGroupSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Group Size
              </label>
              <Select value={maxGroupSize.toString()} onValueChange={(value) => setMaxGroupSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchRecommendations} className="w-full">
                Refresh Recommendations
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && (
        <Tabs defaultValue="groups" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="groups">Recommended Groups</TabsTrigger>
            <TabsTrigger value="partners">Individual Partners</TabsTrigger>
            <TabsTrigger value="activities">Activity Partners</TabsTrigger>
          </TabsList>

          {/* Recommended Groups */}
          <TabsContent value="groups" className="space-y-4">
            {recommendations.recommendedGroups.length > 0 ? (
              <div className="grid gap-4">
                {recommendations.recommendedGroups.map((group) => (
                  <Card key={group.groupId}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {group.groupId.replace('_', ' ').toUpperCase()}
                        </span>
                        <Badge variant="secondary">
                          {group.groupSize} members
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">
                              Average Similarity: {(group.averageSimilarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Age Range: {group.ageRangeMonths.min.toFixed(1)} - {group.ageRangeMonths.max.toFixed(1)} months
                          </div>
                        </div>

                        {group.commonInterests.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Common Interests:</h4>
                            <div className="flex flex-wrap gap-2">
                              {group.commonInterests.map((interest) => (
                                <Badge key={interest} variant="outline">
                                  {interestLabels[interest] || interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Group Members:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.members.map((member) => (
                              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-sm text-gray-600">
                                    Age: {member.age.toFixed(1)} years • {member.program}
                                  </div>
                                </div>
                                <Badge className={getSimilarityColor(member.similarity)}>
                                  {getSimilarityLabel(member.similarity)} Match
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Available</h3>
                  <p className="text-gray-600">
                    Not enough children match the criteria for group recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Individual Partners */}
          <TabsContent value="partners" className="space-y-4">
            {recommendations.individualPartners.length > 0 ? (
              <div className="grid gap-4">
                {recommendations.individualPartners.map((partner) => (
                  <Card key={partner.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-lg">{partner.name}</h3>
                            <Badge className={getSimilarityColor(partner.similarity)}>
                              {getSimilarityLabel(partner.similarity)} Match
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Age: {partner.age.toFixed(1)} years • Program: {partner.program} • 
                            Age Difference: {partner.ageDifference.toFixed(1)} years
                          </div>
                          {partner.interests.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">Interests:</div>
                              <div className="flex flex-wrap gap-1">
                                {partner.interests.map((interest) => (
                                  <Badge key={interest} variant="outline" className="text-xs">
                                    {interestLabels[interest] || interest}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {(partner.similarity * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Similarity</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Partners Found</h3>
                  <p className="text-gray-600">
                    No suitable activity partners found for this child.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Partners */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity-Specific Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Activity Type:
                  </label>
                  <Select value={selectedActivity} onValueChange={handleActivityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an activity..." />
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

                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading activity partners...</span>
                  </div>
                )}

                {activityRecommendations && !loading && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Found {activityRecommendations.totalMatches} children interested in {interestLabels[selectedActivity]}
                    </div>
                    
                    {activityRecommendations.activityPartners.length > 0 ? (
                      <div className="grid gap-3">
                        {activityRecommendations.activityPartners.map((partner) => (
                          <div key={partner.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <div className="font-medium">{partner.name}</div>
                              <div className="text-sm text-gray-600">
                                Age: {partner.age.toFixed(1)} years • {partner.program}
                              </div>
                            </div>
                            <Badge className={getSimilarityColor(partner.similarity)}>
                              {getSimilarityLabel(partner.similarity)} Match
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-600">
                        No children found with interest in {interestLabels[selectedActivity]}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

    </div>
  );
};

export default ChildRecommendations;
