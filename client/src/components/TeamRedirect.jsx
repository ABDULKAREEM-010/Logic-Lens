import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const TeamRedirect = ({ children }) => {
  const [hasTeams, setHasTeams] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserTeams();
  }, []);

  const checkUserTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a member of any team
      const { data: teamMemberships, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      if (teamMemberships && teamMemberships.length > 0) {
        // User has teams, redirect to teams page
        setHasTeams(true);
        navigate('/teams');
      } else {
        // User has no teams, allow access to create/join pages
        setHasTeams(false);
      }
    } catch (err) {
      console.error('Error checking user teams:', err);
      // On error, allow access to create/join pages
      setHasTeams(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(102, 126, 234, 0.2)',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Checking your teams...</p>
      </div>
    );
  }

  // If user has no teams, render the children (CreateTeam or JoinTeam)
  return !hasTeams ? children : null;
};

export default TeamRedirect;