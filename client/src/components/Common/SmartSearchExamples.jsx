// Example: Add Smart Search to Admin Dashboard User Management

import SmartSearch from '../Common/SmartSearch';

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>User Management</Typography>
      
      {/* Smart Search for Users */}
      <SmartSearch
        data={users}
        searchKeys={['firstName', 'lastName', 'email', 'role', 'phone']}
        onSelect={(user) => {
          // Open user details modal or navigate to user page
          console.log('Selected user:', user);
        }}
        placeholder="Search users by name, email, role, or phone..."
        label="Find User"
        maxResults={10}
        renderItem={(result) => {
          const user = result.item;
          const matchScore = Math.round((1 - result.score) * 100);
          
          return (
            <ListItem button>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#1abc9c' }}>
                  {user.firstName?.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography>{user.firstName} {user.lastName}</Typography>
                    <Chip label={`${matchScore}% match`} size="small" />
                    <Chip label={user.role} size="small" color="primary" />
                  </Box>
                }
                secondary={`${user.email} | ${user.phone || 'No phone'}`}
              />
            </ListItem>
          );
        }}
      />
      
      {/* Rest of user management UI */}
    </Box>
  );
}

// ============================================================

// Example: Add Smart Search to E-commerce Product Page

import SmartSearch from '../Common/SmartSearch';

function ProductCatalog() {
  const [products, setProducts] = useState([]);
  
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Products</Typography>
      
      {/* Smart Search for Products */}
      <SmartSearch
        data={products}
        searchKeys={['name', 'description', 'category', 'brand', 'tags']}
        onSelect={(product) => {
          // Navigate to product details or add to cart
          navigate(`/products/${product._id}`);
        }}
        placeholder="Search products by name, category, or description..."
        label="Search Products"
        maxResults={8}
        renderItem={(result) => {
          const product = result.item;
          const matchScore = Math.round((1 - result.score) * 100);
          
          return (
            <ListItem button>
              <ListItemAvatar>
                <Avatar 
                  variant="square" 
                  src={product.images?.[0]} 
                  sx={{ width: 60, height: 60 }}
                >
                  {product.name?.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography>{product.name}</Typography>
                    <Chip label={`${matchScore}% match`} size="small" />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      {product.category} | ₹{product.price}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {product.description?.substring(0, 50)}...
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        }}
      />
      
      {/* Product grid */}
    </Box>
  );
}

// ============================================================

// Example: Add Smart Search to Messages/Communication

import SmartSearch from '../Common/SmartSearch';

function MessagesList() {
  const [conversations, setConversations] = useState([]);
  
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Messages</Typography>
      
      {/* Smart Search for Conversations */}
      <SmartSearch
        data={conversations}
        searchKeys={['participantName', 'lastMessage', 'subject']}
        onSelect={(conversation) => {
          // Open conversation
          setSelectedConversation(conversation);
        }}
        placeholder="Search conversations or messages..."
        label="Search Messages"
        maxResults={6}
      />
      
      {/* Conversation list */}
    </Box>
  );
}

// ============================================================

// Example: Add Smart Search to Reports Section

import SmartSearch from '../Common/SmartSearch';

function ReportsSection() {
  const [reports, setReports] = useState([]);
  
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Reports</Typography>
      
      {/* Smart Search for Reports */}
      <SmartSearch
        data={reports}
        searchKeys={['title', 'childName', 'type', 'date', 'notes']}
        onSelect={(report) => {
          // View report details
          viewReport(report);
        }}
        placeholder="Search reports by child name, date, or type..."
        label="Find Report"
        maxResults={7}
        renderItem={(result) => {
          const report = result.item;
          const matchScore = Math.round((1 - result.score) * 100);
          
          return (
            <ListItem button>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#1abc9c' }}>
                  <AssessmentIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography>{report.title}</Typography>
                    <Chip label={`${matchScore}% match`} size="small" />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      Child: {report.childName} | Date: {new Date(report.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Type: {report.type}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        }}
      />
      
      {/* Reports list/grid */}
    </Box>
  );
}

// ============================================================

// Example: Global Search Bar (searches everything)

import SmartSearch from '../Common/SmartSearch';

function GlobalSearchBar() {
  const [allData, setAllData] = useState([]);
  
  // Combine data from different sources
  useEffect(() => {
    const combined = [
      ...children.map(c => ({ ...c, type: 'child' })),
      ...products.map(p => ({ ...p, type: 'product' })),
      ...staff.map(s => ({ ...s, type: 'staff' })),
      ...reports.map(r => ({ ...r, type: 'report' }))
    ];
    setAllData(combined);
  }, []);
  
  return (
    <SmartSearch
      data={allData}
      searchKeys={['name', 'firstName', 'lastName', 'title', 'description', 'email']}
      onSelect={(item) => {
        // Navigate based on type
        switch(item.type) {
          case 'child':
            navigate(`/children/${item._id}`);
            break;
          case 'product':
            navigate(`/products/${item._id}`);
            break;
          case 'staff':
            navigate(`/staff/${item._id}`);
            break;
          case 'report':
            navigate(`/reports/${item._id}`);
            break;
        }
      }}
      placeholder="Search anything in the system..."
      label="Global Search"
      maxResults={10}
      renderItem={(result) => {
        const item = result.item;
        const matchScore = Math.round((1 - result.score) * 100);
        
        const getIcon = () => {
          switch(item.type) {
            case 'child': return <ChildCareIcon />;
            case 'product': return <ShoppingCartIcon />;
            case 'staff': return <PeopleIcon />;
            case 'report': return <AssessmentIcon />;
            default: return <SearchIcon />;
          }
        };
        
        return (
          <ListItem button>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: '#1abc9c' }}>
                {getIcon()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography>
                    {item.name || item.firstName || item.title}
                  </Typography>
                  <Chip label={item.type} size="small" color="primary" />
                  <Chip label={`${matchScore}% match`} size="small" />
                </Box>
              }
              secondary={item.description || item.email || ''}
            />
          </ListItem>
        );
      }}
    />
  );
}
