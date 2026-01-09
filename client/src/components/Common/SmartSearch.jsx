import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Avatar,
  Box,
  Typography,
  Chip,
  InputAdornment,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PersonIcon from '@mui/icons-material/Person';
import Fuse from 'fuse.js';

/**
 * SmartSearch Component - Fuzzy search with natural language support
 * 
 * @param {Array} data - Array of objects to search through
 * @param {Array} searchKeys - Keys to search in (e.g., ['name', 'email', 'parentName'])
 * @param {Function} onSelect - Callback when item is selected
 * @param {String} placeholder - Placeholder text
 * @param {Function} renderItem - Custom render function for list items
 * @param {Number} maxResults - Maximum results to show
 */
function SmartSearch({ 
  data = [], 
  searchKeys = ['name'], 
  onSelect,
  placeholder = 'Search...',
  renderItem,
  maxResults = 5,
  label = 'Search'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Configure Fuse.js for fuzzy search
  const fuseOptions = {
    keys: searchKeys,
    threshold: 0.3, // 0 = exact match, 1 = match anything
    distance: 100,
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true
  };

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Perform fuzzy search
    const fuse = new Fuse(data, fuseOptions);
    const searchResults = fuse.search(searchQuery);
    
    // Limit results
    const limitedResults = searchResults.slice(0, maxResults);
    setResults(limitedResults);
    setShowResults(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, data]);

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    setSearchQuery('');
    setShowResults(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setShowResults(false);
  };

  const defaultRenderItem = (result) => {
    const item = result.item;
    const matchScore = Math.round((1 - result.score) * 100);

    return (
      <ListItem
        button
        onClick={() => handleSelect(item)}
        sx={{
          '&:hover': {
            bgcolor: 'rgba(26, 188, 156, 0.1)'
          }
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: '#1abc9c' }}>
            <PersonIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1">
                {item.name || item.title || 'Unknown'}
              </Typography>
              <Chip 
                label={`${matchScore}% match`} 
                size="small" 
                color="success"
                sx={{ height: 20 }}
              />
            </Box>
          }
          secondary={
            <Box>
              {item.email && <Typography variant="caption" display="block">{item.email}</Typography>}
              {item.parentName && <Typography variant="caption" display="block">Parent: {item.parentName}</Typography>}
              {item.age && <Typography variant="caption" display="block">Age: {item.age}</Typography>}
            </Box>
          }
        />
      </ListItem>
    );
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        label={label}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#1abc9c' }} />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#1abc9c'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1abc9c'
            }
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#1abc9c'
          }
        }}
      />

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            borderRadius: 2
          }}
        >
          <List sx={{ p: 0 }}>
            {results.map((result, index) => (
              <React.Fragment key={result.item._id || index}>
                {renderItem ? renderItem(result) : defaultRenderItem(result)}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* No Results Message */}
      {showResults && results.length === 0 && searchQuery.trim().length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 1,
            p: 2,
            textAlign: 'center',
            borderRadius: 2
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No results found for "{searchQuery}"
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Try different keywords or check spelling
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default SmartSearch;
