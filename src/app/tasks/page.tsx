
'use client';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, ExternalLink } from 'lucide-react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, increment, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState, FormEvent, useMemo } from 'react';

type Task = {
  id: string;
  title: string;
  reward: number;
  url?: string;
  verificationText?: string;
};

type UserTask = {
    id: string;
    userId: string;
    taskId: string;
    status: 'pending_verification' | 'completed' | 'rejected';
};

const TaskCard = ({ task, userId, userEmail, userTaskStatus }: { task: Task, userId?: string, userEmail?: string, userTaskStatus?: 'completed' | 'pending_verification' | 'rejected' }) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [verificationInput, setVerificationInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const status = userTaskStatus;

  const handleAutomaticVerification = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !firestore || !task.verificationText) return;
    
    setIsVerifying(true);

    if (verificationInput.trim().toLowerCase() !== task.verificationText.trim().toLowerCase()) {
      toast({
        variant: 'destructive',
        title: 'Incorrect Code',
        description: 'The verification code is incorrect. Please try again.',
      });
      setIsVerifying(false);
      return;
    }

    try {
      const userRef = doc(firestore, 'users', userId);
      const userTaskRef = doc(firestore, 'user_tasks', `${userId}_${task.id}`);
      const notificationsRef = collection(userRef, 'notifications');
      
      const batch = writeBatch(firestore);

      // Update user balance
      batch.update(userRef, { verifiedBalance: increment(task.reward) });
      
      // Mark task as completed
      batch.set(userTaskRef, {
        userId: userId,
        userEmail: userEmail,
        taskId: task.id,
        taskTitle: task.title,
        status: 'completed',
        submittedAt: serverTimestamp(),
      }, { merge: true });

      // Create notification
      batch.set(doc(notificationsRef), {
        type: 'reward',
        title: `Task Completed: ${task.title}`,
        description: `You earned +${task.reward} Fair.`,
        amount: task.reward,
        isRead: false,
        timestamp: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: 'Task Verified!',
        description: `You have earned ${task.reward} FAIR tokens.`,
      });
      setVerificationInput('');
    } catch (error) {
      console.error("Error verifying task:", error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Could not process the task. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (status === 'completed') {
    return (
        <Card className="w-full">
            <CardContent className="p-3">
                <div className="flex justify-between items-center text-gray-400">
                    <p className="font-semibold line-through">{task.title}</p>
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckSquare className="h-5 w-5" />
                        <span className="font-semibold text-sm">Completed</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-black">{task.title}</p>
              <div className="flex items-center justify-center text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">+{task.reward} Fair</div>
            </div>
            {task.url && (
              <Link href={task.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  Open Link <ExternalLink className="h-3 w-3" />
              </Link>
            )}
        </div>
        {task.verificationText && (
          <form onSubmit={handleAutomaticVerification} className="flex items-center gap-2">
            <Input 
                type="text"
                placeholder="Enter code..."
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                required
                className='h-9 text-sm text-black bg-white border-gray-300'
                disabled={isVerifying}
            />
            <Button type="submit" size="sm" className="h-9 text-sm px-4 text-white" disabled={isVerifying}>
                {isVerifying ? '...' : 'Verify'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};


export default function TasksPage() {
  const { firestore, user } = useFirebase();
  
  const tasksQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tasks') : null),
    [firestore]
  );
  
  const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
  
  const userTasksQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'user_tasks'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  
  const { data: userTasks, isLoading: isLoadingUserTasks } = useCollection<UserTask>(userTasksQuery);

  const userTasksMap = useMemo(() => {
    if (!userTasks) return new Map();
    return userTasks.reduce((acc, ut) => {
      acc.set(ut.taskId, ut.status);
      return acc;
    }, new Map<string, 'completed' | 'pending_verification' | 'rejected'>());
  }, [userTasks]);
  
  const currentTasks = tasks || [];
  const isLoadingData = isLoading || (user && isLoadingUserTasks);

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {isLoadingData ? (
          <div className="space-y-4">
            <Card className="p-4 h-24 animate-pulse bg-gray-200"></Card>
            <Card className="p-4 h-24 animate-pulse bg-gray-200"></Card>
            <Card className="p-4 h-24 animate-pulse bg-gray-200"></Card>
          </div>
        ) : currentTasks.length > 0 ? (
          <div className="grid gap-4">
            {currentTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                userId={user?.uid} 
                userEmail={user?.email || undefined} 
                userTaskStatus={userTasksMap.get(task.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              No tasks yet
            </h2>
            <p>Please check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}

    