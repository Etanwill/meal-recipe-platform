// frontend/src/pages/AboutUs.jsx
// Add this file to your frontend/src/pages/ folder
// Then add the route in App.jsx: <Route path="/about" element={<AboutUs />} />
// And add a link in your navbar

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  Code,
  Storage,
  Security,
  School,
  GitHub,
  Email,
} from '@mui/icons-material';

const teamMembers = [
  {
    name: 'Etan Will John',          // ← CHANGE TO YOUR REAL NAME
    role: 'Full Stack Developer & DevOps Engineer',
    responsibilities: [
      'Backend API Development (Python Flask)',
      'Database Design (PostgreSQL)',
      'Docker & Kubernetes Setup',
      'CI/CD Pipeline (Jenkins)',
      'Chaos Engineering',
    ],
    avatar: 'EW',               // ← YOUR INITIALS
    color: '#FF6B35',
    skills: ['Python', 'Flask', 'Docker', 'PostgreSQL', 'Jenkins'],
    email: 'etanwill@gmail.com',     // ← YOUR EMAIL
    github: 'Etanwill',
  },
  {
    name: 'Brondy Noumsi Kamgang',       // ← CHANGE TO TEAMMATE'S REAL NAME
    role: 'Frontend Developer & UI/UX Designer',
    responsibilities: [
      'React Frontend Development',
      'Material UI Design System',
      'User Authentication Flow',
      'Vendor & Customer Dashboards',
      'Recipe Management System',
    ],
    avatar: 'TN',                // ← TEAMMATE'S INITIALS
    color: '#2E86AB',
    skills: ['React', 'JavaScript', 'Material UI', 'Figma', 'CSS'],
    email: 'teammate@example.com',       // ← TEAMMATE'S EMAIL
    github: 'teammate-github',
  },
];

const projectStats = [
  { label: 'Lines of Code', value: '5,000+' },
  { label: 'API Endpoints', value: '25+' },
  { label: 'Unit Tests', value: '31' },
  { label: 'Docker Services', value: '5' },
  { label: 'Weeks to Build', value: '8' },
  { label: 'Test Coverage', value: '80%+' },
];

const techStack = [
  { category: 'Backend', items: ['Python 3.11', 'Flask', 'SQLAlchemy', 'JWT Auth', 'PostgreSQL'] },
  { category: 'Frontend', items: ['React 18', 'Material UI', 'Axios', 'React Router'] },
  { category: 'DevOps', items: ['Docker', 'Kubernetes', 'Jenkins', 'Ansible', 'Nginx'] },
  { category: 'Monitoring', items: ['Prometheus', 'Grafana', 'Health Checks', 'Alerts'] },
];

export default function AboutUs() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: 10, pb: 6 }}>
      <Container maxWidth="lg">

        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            About Our Team
          </Typography>
          <Typography variant="h6" color="text.secondary" maxWidth={600} mx="auto">
            We are two Computer Science students from the Faculty of Information
            and Communication Technologies, building real-world solutions for Cameroon.
          </Typography>
        </Box>

        {/* Project Overview */}
        <Paper elevation={3} sx={{ p: 4, mb: 6, borderRadius: 3, bgcolor: '#FFF8F5' }}>
          <Typography variant="h5" fontWeight="bold" mb={2} color="#FF6B35">
            🍽️ The Project: MealOrder Cameroon
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            MealOrder Cameroon is a community-driven food ordering and recipe learning platform
            designed specifically for the Cameroonian market. Customers can order authentic
            Cameroonian dishes from local vendors, while also learning how to prepare those same
            dishes through step-by-step recipe guides. This dual-purpose approach is what makes
            our platform unique — we connect food lovers not just to meals, but to the culture
            behind them.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The platform is built with a microservices-inspired architecture, containerised with
            Docker, orchestrated with Kubernetes, monitored with Prometheus and Grafana, and
            deployed through a fully automated Jenkins CI/CD pipeline.
          </Typography>
        </Paper>

        {/* Project Stats */}
        <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
          Project Statistics
        </Typography>
        <Grid container spacing={2} mb={6}>
          {projectStats.map((stat) => (
            <Grid item xs={6} sm={4} md={2} key={stat.label}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight="bold" color="#FF6B35">
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Team Members */}
        <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
          Meet the Team
        </Typography>
        <Grid container spacing={4} mb={6}>
          {teamMembers.map((member) => (
            <Grid item xs={12} md={6} key={member.name}>
              <Card elevation={3} sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <Avatar
                      sx={{
                        width: 72,
                        height: 72,
                        bgcolor: member.color,
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        mr: 2,
                      }}
                    >
                      {member.avatar}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.role}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                    Responsibilities
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 0 }}>
                    {member.responsibilities.map((r) => (
                      <Typography component="li" variant="body2" color="text.secondary" key={r}>
                        {r}
                      </Typography>
                    ))}
                  </Box>

                  <Box mt={2}>
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      Tech Skills
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {member.skills.map((skill) => (
                        <Chip key={skill} label={skill} size="small" sx={{ bgcolor: member.color + '22', color: member.color }} />
                      ))}
                    </Box>
                  </Box>

                  <Box mt={2} display="flex" gap={2}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {member.email}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <GitHub fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {member.github}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tech Stack */}
        <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
          Technology Stack
        </Typography>
        <Grid container spacing={3} mb={6}>
          {techStack.map((stack) => (
            <Grid item xs={12} sm={6} md={3} key={stack.category}>
              <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" mb={2} color="#FF6B35">
                    {stack.category}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {stack.items.map((item) => (
                      <Chip key={item} label={item} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Course Info */}
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center', borderRadius: 3, bgcolor: '#F5F5F5' }}>
          <Box display="flex" justifyContent="center" gap={1} mb={1}>
            <School color="action" />
            <Typography variant="subtitle1" fontWeight="bold">
              Academic Context
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Faculty of Information and Communication Technologies
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Course: Software Architecture (SEN3244) | Spring 2026
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Instructor: Engr. TEKOH PALMA
          </Typography>
        </Paper>

      </Container>
    </Box>
  );
}
