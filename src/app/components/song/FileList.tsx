import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Plus, FileAudio, Image as ImageIcon, File, Eye, Play, Download, Trash2 } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';
import { Song, ProjectContext, useProjects } from '@/contexts/ProjectContext';
import { getMediaUrl } from '@/services/api';
import { useTranslation } from 'react-i18next';
import SpeakerIcon from '@/assets/speaker.svg';

interface FileListProps {
  song: Song;
  onUpload: (type: 'song') => void;
  isUploading: boolean;
  uploadStatus: string;
  uploadProgress: number;
  onPreview: (file: { url: string; type: string; name: string }) => void;
  onDelete: (url: string) => void;
}

export function FileList({ 
  song, 
  onUpload, 
  isUploading, 
  uploadStatus, 
  uploadProgress, 
  onPreview, 
  onDelete 
}: FileListProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-[#151518] border-[#2B2B31]">
      <CardHeader>
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-[#EDEDED]">{t('files_media', 'Archivos y media')}</CardTitle>
              <Button size="sm" onClick={() => onUpload('song')} disabled={isUploading} className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                <Plus className="size-4 md:mr-2" />
                <span className="hidden md:inline">{t('add_file', 'Añadir archivo')}</span>
              </Button>
            </div>
            {isUploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-[#EDEDED]/60">
                        <span>{uploadStatus}</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {song.files.length === 0 ? (
          <>
            <img src={SpeakerIcon} alt="speaker" className="size-12 mx-auto text-[#EDEDED]/40 mb-2" />
            <p className="text-sm text-[#EDEDED]/40 text-center py-4">
              {t('no_files', 'No hay archivos adjuntos')}
            </p>
          </>
        ) : (
          <div className="space-y-2">
            {song.files.map((file) => (
              <div key={file.url} className="flex items-center gap-3 p-3 bg-[#0B0B0C] border border-[#2B2B31] rounded-lg group">
                {file.type.startsWith('audio') ? (
                  <FileAudio className="size-5 text-blue-500" />
                ) : file.type.startsWith('image') ? (
                  <ImageIcon className="size-5 text-green-500" />
                ) : (
                  <File className="size-5 text-[#EDEDED]/60" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#EDEDED] truncate" title={file.name}>{file.name}</p>
                </div>
                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {(file.type.startsWith('audio') || file.type.startsWith('video') || file.type.startsWith('image')) && (
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        onClick={() => onPreview(file)}
                        title={t('view_play', "Reproducir/Ver")}
                      >
                          {file.type.startsWith('image') ? <Eye className="size-4" /> : <Play className="size-4" />}
                      </Button>
                    )}
                    
                      <a 
                      href={getMediaUrl(file.url)}
                      download 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-[#2B2B31] rounded-md text-[#EDEDED]/60"
                      title={t('download', "Descargar")}
                    >
                        <Download className="size-4" />
                    </a>
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => onDelete(file.url)}
                      title={t('delete', "Eliminar")}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
