import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  mentions: string[];
}

export interface MediaFile {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface Tablature {
  id: string;
  instrument: string;
  instrumentIcon: string;
  name: string;
  tuning: string;
  content: string;
  files: MediaFile[];
}

export interface Song {
  id: string;
  name: string;
  bandName: string;
  originalBand?: string;
  bpm: number;
  key: string;
  files: MediaFile[];
  tablatures: Tablature[];
  orderIndex?: number;
}

export interface SongList {
  id: string;
  name: string;
  songs: Song[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  ownerId: string;
  members: Member[];
  songLists: SongList[];
  chat: ChatMessage[];
  createdAt: Date;
}

export interface Invitation {
  id: string;
  bandId: string;
  bandName: string;
}

interface ProjectContextType {
  projects: Project[];
  invitations: Invitation[];
  isLoading: boolean;
  currentProject: Project | null;
  createProject: (name: string, description: string, imageUrl?: string) => Promise<void>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  selectProject: (projectId: string) => void;
  inviteMember: (projectId: string, email: string) => Promise<void>;
  leaveProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  fetchInvitations: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  sendMessage: (projectId: string, message: string) => void;
  createSongList: (projectId: string, name: string) => void;
  updateSongList: (projectId: string, listId: string, name: string) => void;
  deleteSongList: (projectId: string, listId: string) => void;
  reorderSongs: (projectId: string, listId: string, songIds: string[]) => void;
  createSong: (projectId: string, listId: string, song: Omit<Song, 'id' | 'tablatures' | 'files' | 'bandName'>) => void;
  updateSong: (projectId: string, listId: string, songId: string, data: Partial<Song>) => void;
  deleteSong: (projectId: string, listId: string, songId: string) => void;
  addSongFile: (projectId: string, listId: string, songId: string, file: Omit<MediaFile, 'id'>) => void;
  deleteSongFile: (projectId: string, listId: string, songId: string, fileUrl: string) => void;
  createTablature: (projectId: string, listId: string, songId: string, tablature: Omit<Tablature, 'id' | 'files'>) => void;
  updateTablature: (projectId: string, listId: string, songId: string, tabId: string, data: Partial<Tablature>) => void;
  deleteTablature: (projectId: string, listId: string, songId: string, tabId: string) => void;
  addTablatureFile: (projectId: string, listId: string, songId: string, tabId: string, file: Omit<MediaFile, 'id'>) => void;
  deleteTablatureFile: (projectId: string, listId: string, songId: string, tabId: string, fileUrl: string) => void;
  kickMember: (projectId: string, memberId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/bands/my-bands');
      // Map API response to Project interface
      const mappedProjects: Project[] = response.data.map((band: any) => ({
        id: String(band.id),
        name: band.name,
        description: band.description,
        imageUrl: band.photo,
        ownerId: band.ownerId ? String(band.ownerId) : (user?.id || ''), // Use backend ownerId
        members: band.members ? band.members.map((m: any) => ({
          id: String(m.id),
          name: m.name,
          email: m.email
        })) : band.users ? band.users.map((u: any) => ({ // Fallback if backend returns users list
          id: String(u.id),
          name: u.name,
          email: u.email
        })) : [],
        songLists: band.songLists ? band.songLists.map((list: any) => ({
          id: String(list.id),
          name: list.name,
          songs: list.songs ? list.songs.map((song: any) => ({
            id: String(song.id),
            name: song.name,
            bandName: band.name,
            originalBand: song.originalBand,
            bpm: song.bpm,
            key: song.songKey,
            files: song.files || [],
            tablatures: song.tablatures ? song.tablatures.map((tab: any) => ({
              id: String(tab.id),
              name: tab.name,
              instrument: tab.instrument,
              instrumentIcon: tab.instrumentIcon,
              tuning: tab.tuning,
              content: tab.content,
              files: tab.files || []
            })) : []
          })) : []
        })) : [],
        chat: band.chatMessages ? band.chatMessages.map((msg: any) => ({
          id: String(msg.id),
          userId: msg.sender ? String(msg.sender.id) : 'unknown',
          userName: msg.sender ? msg.sender.name : 'Unknown User',
          message: msg.message || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          mentions: [] 
        })) : [],
        createdAt: new Date(),
      }));
      setProjects(mappedProjects);
    } catch (error) {
      console.error("Error fetching projects", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  const fetchInvitations = useCallback(async () => {
    try {
        const response = await api.get('/invitations/mine');
        setInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
        console.error("Error fetching invitations", error);
    }
  }, []);

  // Fetch projects from API
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProjects();
      fetchInvitations();
    } else {
      setProjects([]);
      setInvitations([]);
      setIsLoading(false);
    }
  }, [user, fetchProjects, fetchInvitations]);

  const createProject = async (name: string, description: string, imageUrl?: string) => {
    if (!user) return;

    try {
      const bandData = {
        name,
        description,
        photo: imageUrl,
        genre: 'Unknown', // Default
        city: 'Unknown' // Default
      };
      
      const response = await api.post(`/bands/create/${user.id}`, bandData);
      const newBand = response.data;
      
      const newProject: Project = {
        id: String(newBand.id),
        name: newBand.name,
        description: newBand.description,
        imageUrl: newBand.photo,
        ownerId: user.id,
        members: newBand.members ? newBand.members.map((m: any) => ({
            id: String(m.id),
            name: m.name,
            email: m.email
        })) : [{ id: user.id, name: user.name, email: user.email }],
        songLists: [],
        chat: [],
        createdAt: new Date(),
      };

      setProjects([...projects, newProject]);
    } catch (error) {
      console.error("Error creating project", error);
    }
  };

  const updateProject = async (projectId: string, data: Partial<Project>) => {
    try {
        const bandData: any = {};
        if (data.name) bandData.name = data.name;
        if (data.description) bandData.description = data.description;
        if (data.imageUrl) bandData.photo = data.imageUrl;

        await api.put(`/bands/${projectId}`, bandData);
        // Optimize: just update local state instead of refetching or use response
        
        setProjects(projects.map(p => {
            if (p.id === projectId) {
              return { ...p, ...data };
            }
            return p;
          }));
      
          if (currentProject?.id === projectId) {
            setCurrentProject({ ...currentProject, ...data });
          }
    } catch (error) {
        console.error("Error updating project", error);
        throw error;
    }
  };

  const selectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setCurrentProject(project || null);
  };

  const inviteMember = async (projectId: string, email: string) => {
    try {
        await api.post(`/bands/${projectId}/invite`, { email });
        // Don't update local member list yet as it is pending
    } catch (error) {
        console.error("Error inviting member", error);
        throw error;
    }
  };
  
  const acceptInvitation = async (invitationId: string) => {
      try {
          await api.post(`/invitations/${invitationId}/accept`);
          await fetchInvitations();
          await fetchProjects(); // Refresh projects to see the new one
      } catch (error) {
          console.error("Error accepting invitation", error);
          throw error;
      }
  };
  
  const rejectInvitation = async (invitationId: string) => {
      try {
          await api.post(`/invitations/${invitationId}/reject`);
          await fetchInvitations();
      } catch (error) {
          console.error("Error rejecting invitation", error);
          throw error;
      }
  };
  
  const leaveProject = async (projectId: string) => {
      try {
          await api.post(`/bands/${projectId}/leave`);
          setProjects(projects.filter(p => p.id !== projectId));
          if (currentProject?.id === projectId) {
              setCurrentProject(null);
          }
      } catch (error) {
          console.error("Error leaving project", error);
          throw error;
      }
  };

  const kickMember = async (projectId: string, memberId: string) => {
      try {
          await api.delete(`/bands/${projectId}/members/${memberId}`);
          updateLocalProject(projectId, (p) => ({
              ...p,
              members: p.members.filter(m => m.id !== memberId)
          }));
          toast.success('Miembro eliminado del proyecto');
      } catch (error) {
          console.error("Error kicking member", error);
          throw error;
      }
  };

  const deleteProject = async (projectId: string) => {
    try {
        await api.delete(`/bands/${projectId}`);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (currentProject?.id === projectId) {
            setCurrentProject(null);
        }
        toast.success('Proyecto eliminado');
    } catch (error) {
        console.error("Error deleting project:", error);
        throw error;
    }
  };

  const sendMessage = async (projectId: string, message: string) => {
    if (!user) return;
    try {
        const response = await api.post(`/bands/${projectId}/chat`, {
            userId: user.id,
            message: message
        });
        const msg = response.data;
        const newMessage: ChatMessage = {
          id: String(msg.id),
          userId: msg.sender ? String(msg.sender.id) : 'unknown',
          userName: msg.sender ? msg.sender.name : 'Unknown User',
          message: msg.message || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          mentions: [],
        };
        updateLocalProject(projectId, (p) => ({ ...p, chat: [...p.chat, newMessage] }));
    } catch (error) {
        console.error("Error sending message", error);
    }
  };

  const createSongList = async (projectId: string, name: string) => {
    try {
        const response = await api.post(`/bands/${projectId}/songlists`, { name });
        const list = response.data;
        const newList: SongList = { id: String(list.id), name: list.name, songs: [] };
        updateLocalProject(projectId, (p) => ({ ...p, songLists: [...p.songLists, newList] }));
    } catch (error) {
        console.error("Error creating song list", error);
        throw error;
    }
  };

  const updateSongList = async (projectId: string, listId: string, name: string) => {
    try {
        await api.put(`/songlists/${listId}`, { name });
        updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.map(l => l.id === listId ? { ...l, name } : l)
        }));
    } catch(error) { 
        console.error("Error updating song list", error); 
        throw error; 
    }
  };

  const deleteSongList = async (projectId: string, listId: string) => {
    try {
        await api.delete(`/songlists/${listId}`);
        updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.filter(l => l.id !== listId)
        }));
    } catch(error) { 
        console.error("Error deleting song list", error); 
        throw error; 
    }
  };

  const reorderSongs = async (projectId: string, listId: string, songIds: string[]) => {
      // Optimistic update
      updateLocalProject(projectId, (p) => {
          const list = p.songLists.find(l => l.id === listId);
          if (!list) return p;
          
          // Create a map for current songs
          const songsMap = new Map(list.songs.map(s => [s.id, s]));
          
          // Reconstruct the songs array based on songIds order
          // If a song is not in songIds (should not happen in drag n drop full list), keep it at the end? 
          // Ideally songIds contains ALL songs in order.
          
          const newSongs = songIds.map(id => songsMap.get(id)).filter((s): s is Song => !!s);
          
          return {
            ...p,
            songLists: p.songLists.map(l => l.id === listId ? { ...l, songs: newSongs } : l)
          };
      });

      try {
          await api.put(`/songlists/${listId}/reorder`, songIds);
      } catch (error) {
          console.error("Error reordering songs", error);
          throw error;
      }
  };

  const createSong = async (projectId: string, listId: string, song: Omit<Song, 'id' | 'tablatures' | 'files' | 'bandName'>) => {
    try {
        const payload = {
            name: song.name,
            bpm: song.bpm,
            songKey: song.key,
            originalBand: song.originalBand
        };
        const response = await api.post(`/songlists/${listId}/songs`, payload);
        const s = response.data;
        const newSong: Song = { 
            id: String(s.id), 
            name: s.name, 
            bandName: '', // Backend doesn't return this in SongModel, and it's redundant here
            originalBand: s.originalBand,
            bpm: s.bpm, 
            key: s.songKey, 
            tablatures: [], 
            files: [] 
        };
        updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.map(l => l.id === listId ? { ...l, songs: [...l.songs, newSong] } : l)
        }));
    } catch (error) {
        console.error("Error creating song", error);
        throw error;
    }
  };

  const updateSong = async (projectId: string, listId: string, songId: string, data: Partial<Song>) => {
    try {
        const payload: any = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.bpm !== undefined) payload.bpm = data.bpm;
        if (data.key !== undefined) payload.songKey = data.key;
        if (data.originalBand !== undefined) payload.originalBand = data.originalBand;
      await api.put(`/songs/${songId}`, payload);
      
      updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.map(l => l.id === listId ? {
            ...l,
            songs: l.songs.map(s => s.id === songId ? { ...s, ...data } : s)
          } : l)
        }));
    } catch (error) { 
        console.error("Error updating song", error); 
        throw error; 
    }
  };

  const deleteSong = async (projectId: string, listId: string, songId: string) => {
    try {
        await api.delete(`/songs/${songId}`);
        updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.map(l => l.id === listId ? {
            ...l,
            songs: l.songs.filter(s => s.id !== songId)
          } : l)
        }));
    } catch (error) { 
        console.error("Error deleting song", error); 
        throw error; 
    }
  };
  
  const addSongFile = async (projectId: string, listId: string, songId: string, file: Omit<MediaFile, 'id'>) => {
    // 1. We assume the file is already uploaded OR this function handles the whole process.
    // The current signature receives Omit<MediaFile, 'id'> which implies metadata.
    // BUT the component will have the actual File object.
    
    // Changing the logic: The component should handle the upload to /api/upload/* first, 
    // then pass the metadata here. OR we change this signature.
    // Let's keep the signature receiving metadata, assuming the component uploads first.
    // Actually, looking at the component usage: handleFileUpload calls this with { name, type, url }.
    // So the component MUST handle the upload.
    try {
        const response = await api.post(`/songs/${songId}/files`, file);
        const updatedSong = response.data;
        // Update local state
         updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.map(l => l.id === listId ? {
            ...l,
            songs: l.songs.map(s => s.id === songId ? { 
                ...s, 
                files: updatedSong.files || []
            } : s)
          } : l)
        }));
    } catch (error) { 
        console.error("Error adding song file", error); 
        throw error; 
    }
  };
  
  const createTablature = async (projectId: string, listId: string, songId: string, tablature: Omit<Tablature, 'id' | 'files'>) => {
    try {
        const response = await api.post(`/songs/${songId}/tabs`, tablature);
        const t = response.data;
        const newTab: Tablature = {
             id: String(t.id),
             name: t.name,
             instrument: t.instrument,
             instrumentIcon: t.instrumentIcon,
             tuning: t.tuning,
             content: t.content,
             files: []
        };
        
         updateLocalProject(projectId, (p) => ({
          ...p,
          songLists: p.songLists.map(l => l.id === listId ? {
            ...l,
            songs: l.songs.map(s => s.id === songId ? { 
                ...s, 
                tablatures: [...s.tablatures, newTab]
            } : s)
          } : l)
        }));
    } catch (error) { 
        console.error("Error creating tablature", error); 
        throw error; 
    }
  };
  
  const updateTablature = async (projectId: string, listId: string, songId: string, tabId: string, data: Partial<Tablature>) => {
      try {
          await api.put(`/tabs/${tabId}`, data);
           updateLocalProject(projectId, (p) => ({
            ...p,
            songLists: p.songLists.map(l => l.id === listId ? {
                ...l,
                songs: l.songs.map(s => s.id === songId ? { 
                    ...s, 
                    tablatures: s.tablatures.map(t => t.id === tabId ? { ...t, ...data } : t)
                } : s)
            } : l)
            }));
      } catch (error) { 
          console.error("Error updating tablature", error); 
          throw error; 
      }
  };
  
  const deleteTablature = async (projectId: string, listId: string, songId: string, tabId: string) => {
      try {
          await api.delete(`/tabs/${tabId}`);
           updateLocalProject(projectId, (p) => ({
            ...p,
            songLists: p.songLists.map(l => l.id === listId ? {
                ...l,
                songs: l.songs.map(s => s.id === songId ? { 
                    ...s, 
                    tablatures: s.tablatures.filter(t => t.id !== tabId)
                } : s)
            } : l)
            }));
      } catch (error) { 
          console.error("Error deleting tablature", error); 
          throw error; 
      }
  };
  
  const addTablatureFile = async (projectId: string, listId: string, songId: string, tabId: string, file: Omit<MediaFile, 'id'>) => {
      try {
        const response = await api.post(`/tabs/${tabId}/files`, file);
        const updatedTab = response.data;
        
         updateLocalProject(projectId, (p) => ({
            ...p,
            songLists: p.songLists.map(l => l.id === listId ? {
                ...l,
                songs: l.songs.map(s => s.id === songId ? { 
                    ...s, 
                    tablatures: s.tablatures.map(t => t.id === tabId ? {
                        ...t,
                        files: updatedTab.files || []
                    } : t)
                } : s)
            } : l)
        }));
    } catch (error) { 
        console.error("Error adding tablature file", error); 
        throw error; 
    }
  };

  const deleteSongFile = async (projectId: string, listId: string, songId: string, fileUrl: string) => {

      
      // Let's retry properly
      try {
          const response = await api.delete(`/songs/${songId}/files`, { params: { url: fileUrl } });
          const updatedSong = response.data; // Backend returns updated SongModel
          
           updateLocalProject(projectId, (p) => ({
              ...p,
              songLists: p.songLists.map(l => l.id === listId ? {
                ...l,
                songs: l.songs.map(s => s.id === songId ? { 
                    ...s, 
                    files: updatedSong.files || []
                } : s)
              } : l)
            }));
      } catch (error) { 
          console.error("Error deleting song file", error); 
          throw error; 
      }
  };

  const deleteTablatureFile = async (projectId: string, listId: string, songId: string, tabId: string, fileUrl: string) => {
      try {
          const response = await api.delete(`/tabs/${tabId}/files`, { params: { url: fileUrl } });
          const updatedTab = response.data;
          
           updateLocalProject(projectId, (p) => ({
              ...p,
              songLists: p.songLists.map(l => l.id === listId ? {
                  ...l,
                  songs: l.songs.map(s => s.id === songId ? { 
                      ...s, 
                      tablatures: s.tablatures.map(t => t.id === tabId ? {
                          ...t,
                          files: updatedTab.files || []
                      } : t)
                  } : s)
              } : l)
          }));
      } catch (error) { 
          console.error("Error deleting tablature file", error); 
          throw error; 
      }
  };

  // Helper to update local state
  const updateLocalProject = (projectId: string, updater: (p: Project) => Project) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return updater(p);
      }
      return p;
    }));
    if (currentProject?.id === projectId) {
      setCurrentProject(updater(currentProject));
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      invitations,
      isLoading,
      currentProject,
      createProject,
      updateProject,
      selectProject,
      inviteMember,
      leaveProject,
      kickMember,
      deleteProject,
      fetchInvitations,
      acceptInvitation,
      rejectInvitation,
      sendMessage,
      createSongList,
      updateSongList,
      deleteSongList,
      reorderSongs,
      createSong,
      updateSong,
      deleteSong,
      addSongFile,
      deleteSongFile,
      createTablature,
      updateTablature,
      deleteTablature,
      addTablatureFile,
      deleteTablatureFile,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}