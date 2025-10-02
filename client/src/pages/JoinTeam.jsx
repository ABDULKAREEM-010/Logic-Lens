// client/src/pages/JoinTeam.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const JoinTeam = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const joinTeam = async () => {
      try {
        // Get the current logged-in user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          setMessage("You must be logged in to join a team.");
          setLoading(false);
          return;
        }

        const user_id = session.user.id;

        // Upsert (no .single()!)
        const { data, error } = await supabase
          .from("team_members")
          .upsert(
            [{ team_id: teamId, user_id }],
            { onConflict: ["team_id", "user_id"], ignoreDuplicates: true }
          );

        if (error) {
          setMessage(`Failed to join team: ${error.message}`);
        } else {
          setMessage(`Successfully joined team "${teamId}"`);
          // Optional: redirect
          // navigate(`/leader/${teamId}`);
        }

      } catch (err) {
        console.error(err);
        setMessage("An unexpected error occurred while joining the team.");
      } finally {
        setLoading(false);
      }
    };

    joinTeam();
  }, [teamId, navigate]);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      {loading ? <p>Joining team...</p> : <p>{message}</p>}
    </div>
  );
};

export default JoinTeam;
