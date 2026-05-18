import { useState, useRef } from 'react';
import { useGitHubUploader } from '@/hooks/useGitHubUploader';
import { formatBytes } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Upload, FolderGit2, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springPresets, fadeInUp } from '@/lib/motion';

export default function Home() {
  const {
    state,
    isLoading,
    error,
    setToken,
    connectGitHub,
    selectRepo,
    processZipFile,
    startUpload,
    reset,
  } = useGitHubUploader();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      processZipFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processZipFile(file);
    }
  };

  const totalFiles = state.files.length;
  const pendingFiles = state.files.filter(f => f.status === 'pending').length;
  const uploadProgress = totalFiles > 0 ? ((state.uploadedCount + state.failedCount) / (totalFiles - state.skippedCount)) * 100 : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.gentle}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <FolderGit2 className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">رافع GitHub</h1>
          </div>
          <p className="text-muted-foreground text-lg">رفع مشاريعك إلى GitHub بسهولة</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={springPresets.gentle}
          >
            <Card className={state.step >= 1 ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    state.step > 1 ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                    {state.step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                  </div>
                  <div>
                    <CardTitle>الاتصال بـ GitHub</CardTitle>
                    <CardDescription>أدخل الرمز المميز واختر المستودع</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">الرمز المميز لـ GitHub</label>
                  <Input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={state.token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={state.step > 1}
                    className="font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {state.repos.length === 0 ? (
                  <Button
                    onClick={connectGitHub}
                    disabled={isLoading || !state.token.trim()}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الاتصال...
                      </>
                    ) : (
                      'الاتصال'
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">اختر المستودع</label>
                    <Select
                      value={state.selectedRepo?.full_name || ''}
                      onValueChange={(value) => {
                        const repo = state.repos.find(r => r.full_name === value);
                        if (repo) selectRepo(repo);
                      }}
                      disabled={state.step > 1}
                    >
                      <SelectTrigger className="font-mono text-left" dir="ltr">
                        <SelectValue placeholder="اختر مستودع" />
                      </SelectTrigger>
                      <SelectContent>
                        {state.repos.map((repo) => (
                          <SelectItem key={repo.id} value={repo.full_name} className="font-mono text-left" dir="ltr">
                            {repo.full_name} {repo.private && '🔒'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {state.step >= 2 && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={springPresets.gentle}
            >
              <Card className={state.step >= 2 ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      state.step > 2 ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
                    }`}>
                      {state.step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                    </div>
                    <div>
                      <CardTitle>رفع ملف ZIP</CardTitle>
                      <CardDescription>اسحب وأفلت أو اختر ملف ZIP</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {state.files.length === 0 ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary hover:bg-muted/50'
                      }`}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">اسحب ملف ZIP هنا</p>
                      <p className="text-sm text-muted-foreground">أو انقر للاختيار من جهازك</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">إجمالي الملفات: {totalFiles}</p>
                          <p className="text-sm text-muted-foreground">
                            للرفع: {pendingFiles} | متخطى: {state.skippedCount}
                          </p>
                        </div>
                        {state.step === 2 && (
                          <Button onClick={startUpload} disabled={pendingFiles === 0}>
                            بدء الرفع
                          </Button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
                        {state.files.map((file, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02, duration: 0.2 }}
                            className="flex items-center gap-3 p-3 rounded-lg bg-card border"
                          >
                            <div className="flex-shrink-0">
                              {file.status === 'pending' && <FileText className="w-5 h-5 text-muted-foreground" />}
                              {file.status === 'uploading' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                              {file.status === 'success' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                              {file.status === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                              {file.status === 'skipped' && <AlertCircle className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono truncate text-left" dir="ltr">{file.path}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(file.size)}
                                {file.error && ` - ${file.error}`}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {state.step === 3 && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={springPresets.gentle}
            >
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground">
                      3
                    </div>
                    <div>
                      <CardTitle>جاري الرفع</CardTitle>
                      <CardDescription>تتبع تقدم الرفع</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>التقدم الإجمالي</span>
                      <span className="font-medium">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-accent">{state.uploadedCount}</p>
                      <p className="text-sm text-muted-foreground">نجح</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">{state.failedCount}</p>
                      <p className="text-sm text-muted-foreground">فشل</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{state.skippedCount}</p>
                      <p className="text-sm text-muted-foreground">متخطى</p>
                    </div>
                  </div>

                  {uploadProgress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={springPresets.bouncy}
                    >
                      <Alert className="bg-accent/10 border-accent">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <AlertDescription className="text-accent-foreground">
                          اكتمل الرفع! تم رفع {state.uploadedCount} ملف بنجاح.
                        </AlertDescription>
                      </Alert>
                      <Button onClick={reset} className="w-full mt-4">
                        رفع مشروع جديد
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
