import React from 'react';
import { Box, Container, Grid, Tabs, Tab, Typography, Paper } from '@mui/material';

/*
  Approach Page
  - Hero with text + image (like th.png)
  - "How It All Works" section with image and text (like h.png)
  - Tabbed content area for key components (like abt3.png)
  - Uses existing public images to stay within the project
*/

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Approach = () => {
  const [tab, setTab] = React.useState(0);

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ backgroundColor: '#4c1d95', color: 'white', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>Discovery Driven Learning</Typography>
              <Box sx={{ width: 120, height: 6, backgroundColor: '#f59e0b', borderRadius: 9999, mb: 3 }} />
              <Typography variant="h6" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                We inspire explorers, discoverers, and thinkers. TinyTots classrooms are designed to
                cultivate natural curiosity and creative problem-solving through purposeful play.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/children-loop.jpg`}
                alt="Discovery at TinyTots"
                sx={{ width: '100%', height: { xs: 220, md: 340 }, objectFit: 'cover', borderRadius: 3 }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How it works */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: 'rgba(2,132,199,0.06)' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>How It All Works</Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
                <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Children make discoveries about themselves and the world around them through play.
                  At TinyTots, our approach blends structured routines with open-ended exploration,
                  building confidence and a love for learning.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/page.jpg`}
                alt="How it works"
                sx={{ width: '100%', height: { xs: 200, md: 260 }, objectFit: 'cover', borderRadius: 3 }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Components */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, backgroundColor: 'rgba(5,150,105,0.06)' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Our Components</Typography>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
              <Tab label="Relationships" />
              <Tab label="Environments" />
              <Tab label="Teaching Methods" />
              <Tab label="MAPP" />
              <Tab label="Curriculum" />
            </Tabs>

            <TabPanel value={tab} index={0}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box component="img" src={`${process.env.PUBLIC_URL}/vendor-bg.jpg`} alt="Relationships" sx={{ width: '100%', borderRadius: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    Trust and respect are the foundations of learning. We build strong bonds with each child,
                    creating a safe, nurturing environment where they can explore, express themselves, and thrive.
                  </Typography>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <Typography color="text.secondary">Purposeful spaces designed for exploration, movement, and calm—each tailored to early learners.</Typography>
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <Typography color="text.secondary">Play-based, inquiry-driven, and inclusive teaching practices empower every child to succeed.</Typography>
            </TabPanel>
            <TabPanel value={tab} index={3}>
              <Typography color="text.secondary">Monitor, Assess, Plan, and Progress (MAPP) provides families with clear insight into development.</Typography>
            </TabPanel>
            <TabPanel value={tab} index={4}>
              <Typography color="text.secondary">Balanced activities across literacy, numeracy, arts, and wellness nurture the whole child.</Typography>
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default Approach;