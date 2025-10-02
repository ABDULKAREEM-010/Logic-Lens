import React, { useState } from "react";
import { supabase } from "../supabaseClient";

const CreateTeam = () => {
  const [teamName, setTeamName] = useState("");
  const [message, setMessage] = useState("");

  const handleCreateTeam = async () => {
    // Get session using the new API
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setMessage("You must be logged in to create a team.");
      return;
    }

    const user_id = session.user.id;

    const { data, error } = await supabase
      .from("teams")
      .insert([{ team_name: teamName, team_lead_id: user_id }])
      .select()
      .single();

    if (error) {
      setMessage(`Error creating team: ${error.message}`);
    } else {
      setMessage(`Team created! Share this link with members: http://localhost:5173/join/${data.team_id}`);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Create a Team</h2>
      <input
        type="text"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="Team Name"
        style={{ padding: "0.5rem", width: "250px", marginRight: "1rem" }}
      />
      <button onClick={handleCreateTeam} style={{ padding: "0.5rem 1rem" }}>
        Create Team
      </button>
      {message && <p style={{ marginTop: "1rem" }}>{message}</p>}
    </div>
  );
};

export default CreateTeam;
