import React from 'react';
import { Box, Container, Grid, Typography, Button, Tabs, Tab, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function About() {
  const [tab, setTab] = React.useState(0);
  const navigate = useNavigate();

  return (
    <Box sx={{ backgroundColor: '#eef6fb', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
              <Box component="img" src="/about/abts.png" alt="Discovery" sx={{ width: '100%', display: 'block' }} />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Discovery: The Center of Everything We Do
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Our Discovery Driven Learning approach makes early learning an adventure. We nurture curiosity, focus on what interests children most, encourage learning through play, and help them get ready for school success.
            </Typography>
            <Button variant="contained" size="large" onClick={() => navigate('/curriculum')}>Learn More</Button>
          </Grid>
        </Grid>

        <Paper sx={{ mt: 6, p: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
            <Tab label="Relationships" />
            <Tab label="Communities" />
            <Tab label="Environments" />
            <Tab label="Teaching Methods" />
            <Tab label="MAPP" />
            <Tab label="Curriculum" onClick={() => navigate('/curriculum')} />
          </Tabs>

          <TabPanel value={tab} index={0}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box component="img" src="/about/abt3.png" alt="Relationships" sx={{ width: '100%', borderRadius: 2, boxShadow: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" fontWeight={700} gutterBottom>Relationships</Typography>
                <Typography color="text.secondary">
                  Teachers prioritize building trust and respect with each child, knowing that strong relationships are the foundation for learning. When children feel safe and valued, they explore more freely, building positive self-concept and confidence.
                </Typography>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Typography variant="h5" fontWeight={700} gutterBottom>Communities</Typography>
            <Typography color="text.secondary">We build meaningful connections between families, educators, and the broader community to support holistic learning.</Typography>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Typography variant="h5" fontWeight={700} gutterBottom>Environments</Typography>
            <Typography color="text.secondary">Inviting, safe, and engaging spaces designed to inspire discovery and collaboration.</Typography>
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Typography variant="h5" fontWeight={700} gutterBottom>Teaching Methods</Typography>
            <Typography color="text.secondary">Play-based, inquiry-driven methods that meet children where they are and help them grow.</Typography>
          </TabPanel>

          <TabPanel value={tab} index={4}>
            <Typography variant="h5" fontWeight={700} gutterBottom>MAPP</Typography>
            <Typography color="text.secondary">Our assessment and planning framework that personalizes learning for every child.</Typography>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}