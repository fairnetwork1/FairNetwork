
'use client';

import { useState, useMemo, type FC, type FormEvent, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, addDoc, serverTimestamp, setDoc, updateDoc, increment, getDocs, Timestamp, deleteDoc, onSnapshot, FieldValue, deleteField, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Link as LinkIcon, Gift, Settings, Wallet, DollarSign, Users, ShieldCheck, Clock, Coins, UserPlus, Trash2, Edit, UserCog, Hammer, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { KycApprovalDialog } from '@/components/kyc-approval-dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { subDays, format, startOfDay } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type User = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  verifiedBalance: number;
  unverifiedBalance: number;
  usdtBalance: number;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  role?: 'admin' | 'user';
  createdAt?: Timestamp;
  referredBy?: string | null;
  referrals?: {
    verified: number;
    unverified: number;
    unverifiedRewards: {
        usdt: number;
        fair: number;
    };
    verifiedRewards: {
        usdt: number;
        fair: number;
    };
  }
};

type KycRequest = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  country: string;
  idFrontImageUrl: string;
  idBackImageUrl: string;
  selfieImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
};

type Task = {
  id: string;
  title: string;
  reward: number;
  url?: string;
  verificationText?: string;
};

type DailyCode = {
  id: string;
  code: string;
  rewardAmount: number;
  validUntil: { toDate: () => Date };
};

type AppSettings = {
    dailyCheckInReward?: number;
    miningReward?: number;
    transactionFee?: number;
    minSendAmount?: number;
    usdtTransactionFee?: number;
    minUsdtSendAmount?: number;
    adminWalletBalance?: number;
    adsEnabled?: boolean;
    adReward?: number;
    maintenanceModeEnabled?: boolean;
    appIconUrl?: string;
};

const EditTaskDialog: FC<{ task: Task }> = ({ task }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const updatedData = {
            title: formData.get('title') as string,
            reward: Number(formData.get('reward')),
            url: formData.get('url') as string,
            verificationText: formData.get('verificationText') as string,
        };

        try {
            const taskRef = doc(firestore, 'tasks', task.id);
            await updateDoc(taskRef, updatedData);
            toast({ title: 'Task Updated', description: 'The task has been successfully updated.' });
            setOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the task.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>Update the details for this task.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input id="title" name="title" defaultValue={task.title} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reward">Reward (Fair)</Label>
                        <Input id="reward" name="reward" type="number" step="0.1" defaultValue={task.reward} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="url">Task URL</Label>
                        <Input id="url" name="url" type="url" defaultValue={task.url} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="verificationText">Verification Text</Label>
                        <Input id="verificationText" name="verificationText" defaultValue={task.verificationText} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const EditDailyCodeDialog: FC<{ code: DailyCode }> = ({ code }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const updatedData = {
            rewardAmount: Number(formData.get('rewardAmount')),
            validUntil: new Date(formData.get('validUntil') as string),
        };

        try {
            const codeRef = doc(firestore, 'dailyCodes', code.id);
            await updateDoc(codeRef, updatedData);
            toast({ title: 'Code Updated', description: 'The daily code has been successfully updated.' });
            setOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the code.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle>Edit Daily Code</DialogTitle>
                    <DialogDescription>Update the reward and expiration for "{code.code}".</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="space-y-2">
                        <Label>Code</Label>
                        <Input value={code.code} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rewardAmount">Reward Amount</Label>
                        <Input id="rewardAmount" name="rewardAmount" type="number" step="0.1" defaultValue={code.rewardAmount} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="validUntil">Valid Until</Label>
                        <Input id="validUntil" name="validUntil" type="date" defaultValue={format(code.validUntil.toDate(), 'yyyy-MM-dd')} required />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const UserRow = ({ user }: { user: User }) => {
  const getKycStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'none':
      default:
        return 'outline';
    }
  };
  const kycStatus = user.kycStatus || 'none';
  const kycStatusText = kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1);
  const emailInitial = user.email?.charAt(0).toUpperCase() || '?';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{emailInitial}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className="font-medium">{user.fullName || 'N/A'}</span>
            {user.role === 'admin' && <Badge variant="secondary" className='w-fit'>Admin</Badge>}
          </div>
        </div>
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell className="text-right">
        {user.usdtBalance?.toFixed(2) ?? '0.00'} USDT
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={getKycStatusVariant(kycStatus)}>
          {kycStatusText}
        </Badge>
      </TableCell>
    </TableRow>
  );
};

const UserTable = ({ users, searchTerm }: { users: User[], searchTerm?: string }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Full Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead className="text-right">USDT Balance</TableHead>
        <TableHead className="text-right">KYC Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.length > 0 ? (
        users.map(user => <UserRow key={user.id} user={user} />)
      ) : (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            {searchTerm ? `No users found for "${searchTerm}".` : "No users found."}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

const KycRequestTable: FC<{requests: KycRequest[], onAction: (kycRequest: KycRequest, action: 'approve' | 'reject', reason?: string) => Promise<void>, searchTerm?: string}> = ({ requests, onAction, searchTerm }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Submitted At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length > 0 ? (
          requests.map(req => (
            <TableRow key={req.id}>
              <TableCell>
                <div className="font-medium">{req.fullName}</div>
                <div className="text-sm text-muted-foreground">{req.email}</div>
              </TableCell>
              <TableCell>{req.country}</TableCell>
              <TableCell>{req.submittedAt.toDate().toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <KycApprovalDialog request={req} onAction={onAction} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              {searchTerm ? `No requests found for "${searchTerm}".` : "No pending requests."}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};


export default function AdminPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [kycSearchTerm, setKycSearchTerm] = useState('');
  const isAdmin = user?.email === 'shavezahmad035@gmail.com';
  
  const [activeTab, setActiveTab] = useState('dashboard');

  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [roleUpdateData, setRoleUpdateData] = useState<{email: string, role: 'admin' | 'user'} | null>(null);

  const [newAppIcon, setNewAppIcon] = useState<File | null>(null);
  const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
  const newAppIconRef = useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const usersQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'users') : null),
    [firestore, isAdmin]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const allKycRequestsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'kyc_requests') : null),
    [firestore, isAdmin]
  );
  const { data: allKycRequests, isLoading: isLoadingAllKyc } = useCollection<KycRequest>(allKycRequestsQuery);

  const [kycRequests, setKycRequests] = useState<KycRequest[]>([]);
  const [isLoadingKycRequests, setIsLoadingKycRequests] = useState(true);

  useEffect(() => {
    if (!firestore || !isAdmin) {
        setIsLoadingKycRequests(false);
        return;
    }

    const q = query(collection(firestore, "kyc_requests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const pending: KycRequest[] = [];
        querySnapshot.forEach((doc) => {
          pending.push({ id: doc.id, ...doc.data() } as KycRequest);
        });
        setKycRequests(pending);
        setIsLoadingKycRequests(false);
      }, 
      (error) => {
        console.error("Error fetching pending KYC requests:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch pending KYC requests.'});
        setIsLoadingKycRequests(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, isAdmin, toast]);


  const tasksQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tasks') : null, [firestore]);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const dailyCodesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'dailyCodes') : null, [firestore]);
  const { data: dailyCodes, isLoading: isLoadingDailyCodes } = useCollection<DailyCode>(dailyCodesQuery);

  const appSettingsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'app_settings', 'main') : null), [firestore, user]);
  const { data: appSettings, isLoading: isLoadingAppSettings } = useDoc<AppSettings>(appSettingsRef);

  useEffect(() => {
    if (appSettings?.appIconUrl) {
      setAppIconPreview(appSettings.appIconUrl);
    } else if (!newAppIcon) {
      setAppIconPreview('/logo512.png');
    }
  }, [appSettings, newAppIcon]);

  const handleKycAction = async (kycRequest: KycRequest, action: 'approve' | 'reject', reason?: string) => {
    if (!firestore) return;

    const kycDocRef = doc(firestore, 'kyc_requests', kycRequest.userId);
    const userDocRef = doc(firestore, 'users', kycRequest.userId);

    try {
        const batch = writeBatch(firestore);
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        batch.update(kycDocRef, { 
            status: newStatus,
            rejectionReason: reason || ''
        });
        
        batch.update(userDocRef, { kycStatus: newStatus });

        // If approving, check for referrer and move rewards
        if (action === 'approve') {
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data() as User;
            
            if (userData.referredBy) {
                const referrerRef = doc(firestore, 'users', userData.referredBy);
                const referrerDoc = await getDoc(referrerRef);

                if (referrerDoc.exists()) {
                    const referrerData = referrerDoc.data() as User;
                    const unverifiedUsdt = referrerData.referrals?.unverifiedRewards?.usdt || 0;
                    const unverifiedFair = referrerData.referrals?.unverifiedRewards?.fair || 0;
                    
                    if (unverifiedUsdt > 0 || unverifiedFair > 0) {
                        batch.update(referrerRef, {
                            'referrals.unverified': increment(-1),
                            'referrals.verified': increment(1),
                            'referrals.unverifiedRewards.usdt': increment(-0.5),
                            'referrals.unverifiedRewards.fair': increment(-3),
                            'referrals.verifiedRewards.usdt': increment(0.5),
                            'referrals.verifiedRewards.fair': increment(3),
                            'usdtBalance': increment(0.5),
                            'verifiedBalance': increment(3)
                        });
                    }
                }
            }
        }
        
        await batch.commit();
        
        toast({
            title: `KYC Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
            description: `The request for ${kycRequest.email} has been processed.`,
        });

    } catch (error) {
        console.error("Error processing KYC action:", error);
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: 'Could not process the KYC request. Please try again.',
        });
    }
  };

  const handleCreateTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const reward = Number(formData.get('reward') as string);
    const url = formData.get('url') as string;
    const verificationText = formData.get('verificationText') as string;
    
    try {
      await addDoc(collection(firestore, 'tasks'), { title, reward, url, verificationText });
      toast({
        title: 'Task Created',
        description: 'The new task has been added successfully.',
      });
      form.reset();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        variant: 'destructive',
        title: 'Task Creation Failed',
        description: 'Could not create the new task. Please try again.',
      });
    }
  };
  
  const handleCreateDailyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const code = (formData.get('code') as string).toLowerCase();
    const rewardAmount = Number(formData.get('rewardAmount') as string);
    const validUntilDate = new Date(formData.get('validUntil') as string);
    
    if (!code || !rewardAmount || !validUntilDate) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields for the daily code.' });
        return;
    }

    try {
      const codeRef = doc(firestore, 'dailyCodes', code);
      await setDoc(codeRef, {
        code,
        rewardAmount,
        validUntil: validUntilDate,
        createdAt: serverTimestamp()
      });

      toast({
        title: 'Daily Code Created',
        description: `Code "${code}" is now active.`,
      });
      form.reset();
    } catch (error) {
      console.error("Error creating daily code:", error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the daily code. Please try again.',
      });
    }
  };

  const handleUpdateSettings = async (e: FormEvent<HTMLFormElement> | { maintenanceMode: boolean }) => {
    if (!appSettingsRef) return;
    if ('preventDefault' in e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const settingsToUpdate = {
            dailyCheckInReward: Number(formData.get('dailyCheckInReward')),
            miningReward: Number(formData.get('miningReward')),
            transactionFee: Number(formData.get('transactionFee')),
            minSendAmount: Number(formData.get('minSendAmount')),
            usdtTransactionFee: Number(formData.get('usdtTransactionFee')),
            minUsdtSendAmount: Number(formData.get('minUsdtSendAmount')),
            adReward: Number(formData.get('adReward')),
            adsEnabled: (formData.get('adsEnabled') as string) === 'on',
        };
        try {
            await setDoc(appSettingsRef, settingsToUpdate, { merge: true });
            toast({ title: 'Settings Updated', description: 'Global app settings have been saved.' });
        } catch (error) {
            console.error("Error updating settings:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save settings.' });
        }
    } else {
        // Handle maintenance mode switch
        const settingsToUpdate = { maintenanceModeEnabled: e.maintenanceMode };
        try {
            await setDoc(appSettingsRef, settingsToUpdate, { merge: true });
            toast({ title: 'Maintenance Mode Updated', description: `Site is now ${e.maintenanceMode ? 'under maintenance' : 'live'}.` });
        } catch (error) {
            console.error("Error updating maintenance mode:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update maintenance mode.' });
        }
    }
  };

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAppIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAppIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAppIcon = async () => {
    if (!newAppIcon) {
      toast({ variant: 'destructive', title: 'No Icon Selected', description: 'Please choose an icon file to upload.' });
      return;
    }
    if (!appSettingsRef) return;

    setIsUploadingIcon(true);
    toast({ title: 'Uploading Icon...', description: 'Please wait.' });

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `app/icon.png`);
      
      const snapshot = await uploadBytes(storageRef, newAppIcon);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await updateDoc(appSettingsRef, { appIconUrl: downloadURL });
      
      toast({ title: 'Icon Updated!', description: 'The app icon has been changed successfully.' });
      setNewAppIcon(null);
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not update the app icon.' });
    } finally {
      setIsUploadingIcon(false);
    }
  };
  
  const handleResetIcon = async () => {
    if (!appSettingsRef) return;
    try {
      await updateDoc(appSettingsRef, {
        appIconUrl: deleteField()
      });
      setNewAppIcon(null);
      setAppIconPreview('/logo512.png'); 
      toast({ title: 'Icon Reset', description: 'App icon has been reset to the default.' });
    } catch (error) {
      console.error("Error resetting icon:", error);
      toast({ variant: 'destructive', title: 'Reset Failed', description: 'Could not reset the app icon.' });
    }
  };

  const handleWithdrawFees = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !appSettingsRef) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const amount = Number(formData.get('amount') as string);

    if (!email || !amount || amount <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please provide a valid email and amount.' });
        return;
    }

    try {
        await writeBatch(firestore).commit(); 
        toast({ title: 'Withdrawal Initiated', description: `Withdrawal of ${amount} Fair to ${email} is being processed.`});
        form.reset();
    } catch (error) {
        console.error("Error withdrawing fees:", error);
        toast({ variant: 'destructive', title: 'Withdrawal Failed', description: 'Could not process the withdrawal.' });
    }
  };

  const handleAddFunds = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
  
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') as string).trim();
    const amount = Number(formData.get('amount') as string);
    const reason = formData.get('reason') as string;
    const asset = formData.get('asset') as 'fair' | 'usdt';
  
    if (!email || !amount || amount <= 0 || !reason || !asset) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please provide a valid email, amount, reason, and asset type.',
      });
      return;
    }
  
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        throw new Error('Recipient user not found.');
      }
  
      const recipientDoc = querySnapshot.docs[0];
      const recipientRef = recipientDoc.ref;
  
      const batch = writeBatch(firestore);
      
      const balanceField = asset === 'fair' ? 'verifiedBalance' : 'usdtBalance';
      const assetName = asset.toUpperCase();

      batch.update(recipientRef, { [balanceField]: increment(amount) });
      
      const notificationsRef = collection(recipientRef, 'notifications');
      batch.set(doc(notificationsRef), {
        type: 'bonus',
        title: `You Received a ${assetName} Bonus!`,
        description: `You have received a bonus of ${amount} ${assetName}. Reason: ${reason}`,
        amount: amount,
        asset: asset,
        isRead: false,
        timestamp: serverTimestamp(),
      });
  
      await batch.commit();
  
      toast({
        title: 'Funds Added Successfully!',
        description: `${amount} ${assetName} has been added to ${email}'s account.`,
      });
      form.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Adding Funds Failed',
        description: error.message || 'Could not complete the transaction.',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'tasks', taskId));
        toast({ title: 'Task Deleted', description: 'The task has been removed.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the task.' });
    }
  };

  const handleDeleteDailyCode = async (codeId: string) => {
      if (!firestore) return;
      try {
          await deleteDoc(doc(firestore, 'dailyCodes', codeId));
          toast({ title: 'Code Deleted', description: 'The daily code has been removed.' });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the code.' });
      }
  };

  const handleRoleUpdateRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const role = formData.get('role') as 'admin' | 'user';

    if (securityCode !== '#012') {
      toast({
        variant: 'destructive',
        title: 'Incorrect Security Code',
        description: 'The role was not changed.',
      });
      return;
    }

    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        throw new Error('User not found.');
      }
  
      const userDoc = querySnapshot.docs[0];
      await updateDoc(userDoc.ref, { role });

      toast({
          title: 'Role Updated',
          description: `${email} has been set as ${role}.`,
      });
    } catch (error: any) {
      toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message || 'Could not update user role.',
      });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    return users.filter(
      (user: User) =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);
  
  const verifiedUsers = useMemo(
    () => filteredUsers.filter(user => user.kycStatus === 'approved'),
    [filteredUsers]
  );
  
  const unverifiedUsers = useMemo(
    () => filteredUsers.filter(user => user.kycStatus !== 'approved'),
    [filteredUsers]
  );

  const filteredKycRequests = useMemo(() => {
    if (!kycRequests) return [];
    if (!kycSearchTerm) return kycRequests;
    return kycRequests.filter(
      (req: KycRequest) =>
        req.email?.toLowerCase().includes(kycSearchTerm.toLowerCase()) ||
        req.fullName?.toLowerCase().includes(kycSearchTerm.toLowerCase())
    );
  }, [kycRequests, kycSearchTerm]);

  const {
    totalUsers,
    totalVerified,
    totalPending,
    totalCoins,
    kycChartData,
    userChartData,
    recentUsers,
    recentKycSubmissions,
    topReferrers
  } = useMemo(() => {
    if (!users || !allKycRequests) return {
      totalUsers: 0, totalVerified: 0, totalPending: 0, totalCoins: 0,
      kycChartData: [], userChartData: [], recentUsers: [], recentKycSubmissions: [], topReferrers: []
    };

    const totalUsers = users.length;
    const totalVerified = users.filter(u => u.kycStatus === 'approved').length;
    const totalPending = allKycRequests.filter(r => r.status === 'pending').length;
    const totalRejected = allKycRequests.filter(r => r.status === 'rejected').length;
    
    const totalNone = totalUsers - totalVerified - totalPending - totalRejected;


    const totalCoins = users.reduce((acc, user) => acc + (user.verifiedBalance || 0) + (user.unverifiedBalance || 0), 0);

    const kycChartData = [
      { name: 'Verified', value: totalVerified, fill: 'hsl(var(--chart-1))' },
      { name: 'Pending', value: totalPending, fill: 'hsl(var(--chart-2))' },
      { name: 'Not Submitted', value: totalNone, fill: 'hsl(var(--chart-3))' },
      { name: 'Rejected', value: totalRejected, fill: 'hsl(var(--chart-4))' },
    ];
    
    const today = startOfDay(new Date());
    const userChartData = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        return {
            date: format(date, 'MMM d'),
            users: 0,
        };
    });

    users.forEach(user => {
        if (user.createdAt) {
            const registrationDate = startOfDay(user.createdAt.toDate());
            const diff = (today.getTime() - registrationDate.getTime()) / (1000 * 3600 * 24);
            if (diff >= 0 && diff < 7) {
                const dayIndex = 6 - Math.floor(diff);
                userChartData[dayIndex].users++;
            }
        }
    });

    const recentUsers = [...users].sort((a,b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)).slice(0, 5);
    const recentKycSubmissions = [...allKycRequests].sort((a,b) => b.submittedAt.toMillis() - a.submittedAt.toMillis()).slice(0, 5);

    const topReferrers = [...users]
        .map(u => ({
            ...u,
            totalReferrals: (u.referrals?.verified || 0) + (u.referrals?.unverified || 0)
        }))
        .filter(u => u.totalReferrals > 0)
        .sort((a, b) => b.totalReferrals - a.totalReferrals);

    return { totalUsers, totalVerified, totalPending, totalCoins, kycChartData, userChartData, recentUsers, recentKycSubmissions, topReferrers };
  }, [users, allKycRequests]);

  const kycChartConfig = {
    value: { label: 'Users' },
    Verified: { label: 'Verified', color: 'hsl(var(--chart-1))' },
    Pending: { label: 'Pending', color: 'hsl(var(--chart-2))' },
    'Not Submitted': { label: 'Not Submitted', color: 'hsl(var(--chart-3))' },
    'Rejected': { label: 'Rejected', color: 'hsl(var(--chart-4))' },
  } satisfies ChartConfig;

  const userChartConfig = {
    users: { label: "New Users", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;
  
  const CustomLegend = (props: any) => {
    const { payload } = props;
    const total = payload.reduce((acc: number, entry: any) => acc + entry.payload.value, 0);
    return <p className='text-center text-sm text-muted-foreground'>{`${total} Total Users`}</p>;
  };

  const isLoading = isLoadingUsers || isLoadingAllKyc || isLoadingTasks || isLoadingDailyCodes || isLoadingAppSettings || isLoadingKycRequests;

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="mb-4 flex-wrap h-auto justify-start">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="user-management">User Management</TabsTrigger>
            <TabsTrigger value="kyc-pending">
              KYC Pending <Badge className="ml-2">{kycRequests?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="task-management">Task Management</TabsTrigger>
            <TabsTrigger value="daily-codes">Daily Codes</TabsTrigger>
            <TabsTrigger value="app-settings">App Settings</TabsTrigger>
            <TabsTrigger value="app-icon">App Icon</TabsTrigger>
            <TabsTrigger value="admin-wallet">Admin Wallet</TabsTrigger>
            <TabsTrigger value="fund-management">Fund Management</TabsTrigger>
            <TabsTrigger value="admin-roles">Admin Roles</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            {isLoading ? <Skeleton className='h-[500px] w-full' /> : (
              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalUsers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalVerified}</div>
                    </CardContent>
                  </Card>
                  <div
                    onClick={() => setActiveTab('kyc-pending')}
                    className={cn(
                      'cursor-pointer transition-shadow duration-300',
                      totalPending > 0 && 'hover:shadow-lg'
                    )}
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending KYCs</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalPending}</div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Coins in Circulation</CardTitle>
                      <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalCoins.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>KYC Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ChartContainer config={kycChartConfig} className="w-full h-full">
                          <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                            <Pie data={kycChartData} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={5} >
                                {kycChartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Pie>
                             <Legend content={CustomLegend} />
                          </PieChart>
                        </ChartContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>New Users (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ChartContainer config={userChartConfig} className="w-full h-full">
                          <BarChart data={userChartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                              <Bar dataKey="users" fill="hsl(var(--chart-1))" radius={4} />
                          </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                   <Card>
                      <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Registered</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentUsers.map(u => (
                              <TableRow key={u.id}>
                                <TableCell>
                                  <div className="font-medium">{u.fullName}</div>
                                  <div className="text-sm text-muted-foreground">{u.email}</div>
                                </TableCell>
                                <TableCell>{u.createdAt ? format(u.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent KYC Submissions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Submitted</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentKycSubmissions.map(req => (
                              <TableRow key={req.id}>
                                <TableCell>
                                  <div className="font-medium">{req.fullName}</div>
                                  <div className="text-sm text-muted-foreground">{req.email}</div>
                                </TableCell>
                                <TableCell>{format(req.submittedAt.toDate(), 'PP')}</TableCell>
                                <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : 'default'}>{req.status}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="user-management">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all registered users.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="unverified">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <TabsList>
                      <TabsTrigger value="unverified">
                        Unverified <Badge className="ml-2">{unverifiedUsers.length}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="verified">
                        Verified <Badge className="ml-2">{verifiedUsers.length}</Badge>
                      </TabsTrigger>
                    </TabsList>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by email or name..."
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-white text-black"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                  </div>
                  
                  {isLoadingUsers ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <TabsContent value="unverified">
                        <UserTable users={unverifiedUsers} searchTerm={searchTerm} />
                      </TabsContent>
                      <TabsContent value="verified">
                        <UserTable users={verifiedUsers} searchTerm={searchTerm} />
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc-pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending KYC Requests</CardTitle>
                <div className="flex justify-between items-center">
                    <CardDescription>Review and process new KYC submissions.</CardDescription>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by email or name..."
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-white text-black"
                            value={kycSearchTerm}
                            onChange={(e) => setKycSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingKycRequests ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <KycRequestTable requests={filteredKycRequests} onAction={handleKycAction} searchTerm={kycSearchTerm} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
                <CardHeader>
                    <CardTitle>Top Referrers</CardTitle>
                    <CardDescription>Users who have referred the most new members.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoadingUsers ? <Skeleton className="h-40 w-full" /> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="text-center">Total Referrals</TableHead>
                                <TableHead className="text-center">Verified</TableHead>
                                <TableHead className="text-center">Unverified</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topReferrers.length > 0 ? (
                                topReferrers.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.fullName || 'N/A'}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{user.totalReferrals}</TableCell>
                                        <TableCell className="text-center text-green-600">{user.referrals?.verified || 0}</TableCell>
                                        <TableCell className="text-center text-yellow-600">{user.referrals?.unverified || 0}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No users with referrals yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
                </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="task-management">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create New Task</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Task Title</Label>
                                    <Input id="title" name="title" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reward">Reward (Fair)</Label>
                                    <Input id="reward" name="reward" type="number" step="0.1" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="url">Task URL</Label>
                                    <Input id="url" name="url" type="url" placeholder="https://example.com/task" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="verificationText">Verification Text</Label>
                                    <Input id="verificationText" name="verificationText" placeholder="e.g. a specific code or phrase" />
                                </div>
                                <Button type="submit">Create Task</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingTasks ? <Skeleton className="h-20 w-full" /> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Reward</TableHead>
                                            <TableHead>URL</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tasks?.map(task => (
                                            <TableRow key={task.id}>
                                                <TableCell className="font-medium">{task.title}</TableCell>
                                                <TableCell>{task.reward} Fair</TableCell>
                                                <TableCell>
                                                    {task.url ? (
                                                        <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                            <LinkIcon className="h-4 w-4 inline-block" />
                                                        </a>
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <EditTaskDialog task={task} />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the task.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
          </TabsContent>
          
          <TabsContent value="daily-codes">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Daily Code</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateDailyCode} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Code</Label>
                                    <Input id="code" name="code" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rewardAmount">Reward Amount</Label>
                                    <Input id="rewardAmount" name="rewardAmount" type="number" step="0.1" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="validUntil">Valid Until</Label>
                                    <Input id="validUntil" name="validUntil" type="date" required />
                                </div>
                                <Button type="submit">Create Code</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active &amp; Expired Codes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingDailyCodes ? <Skeleton className="h-20 w-full" /> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Reward</TableHead>
                                            <TableHead>Expires</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailyCodes?.sort((a,b) => b.validUntil.toDate().getTime() - a.validUntil.toDate().getTime()).map(code => (
                                            <TableRow key={code.id}>
                                                <TableCell className="font-mono">{code.code}</TableCell>
                                                <TableCell>{code.rewardAmount} Fair</TableCell>
                                                <TableCell>{code.validUntil.toDate().toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={code.validUntil.toDate() > new Date() ? 'default' : 'outline'}>
                                                        {code.validUntil.toDate() > new Date() ? 'Active' : 'Expired'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <EditDailyCodeDialog code={code} />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete the code "{code.code}".
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteDailyCode(code.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="app-settings">
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>Manage global rewards, fees, and other app-wide settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingAppSettings ? <Skeleton className="h-60 w-full" /> : (
                        <form onSubmit={(e) => handleUpdateSettings(e as FormEvent<HTMLFormElement>)} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="dailyCheckInReward">Daily Check-in Reward (Fair)</Label>
                                    <Input id="dailyCheckInReward" name="dailyCheckInReward" type="number" step="0.1" defaultValue={appSettings?.dailyCheckInReward ?? 1} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="miningReward">Mining Reward (Fair)</Label>
                                    <Input id="miningReward" name="miningReward" type="number" step="0.1" defaultValue={appSettings?.miningReward ?? 2} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="transactionFee">Fair Transaction Fee</Label>
                                    <Input id="transactionFee" name="transactionFee" type="number" step="0.01" defaultValue={appSettings?.transactionFee ?? 0.3} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="minSendAmount">Min Send Amount (Fair)</Label>
                                    <Input id="minSendAmount" name="minSendAmount" type="number" step="1" defaultValue={appSettings?.minSendAmount ?? 50} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="usdtTransactionFee">USDT Transaction Fee</Label>
                                    <Input id="usdtTransactionFee" name="usdtTransactionFee" type="number" step="0.01" defaultValue={appSettings?.usdtTransactionFee ?? 0.1} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="minUsdtSendAmount">Min Send Amount (USDT)</Label>
                                    <Input id="minUsdtSendAmount" name="minUsdtSendAmount" type="number" step="1" defaultValue={appSettings?.minUsdtSendAmount ?? 10} required />
                                </div>
                            </div>
                             <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Switch id="adsEnabled" name="adsEnabled" defaultChecked={appSettings?.adsEnabled ?? false} />
                                    <Label htmlFor="adsEnabled">Rewarded Ads Enabled</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adReward">Rewarded Ad Bonus (FairX)</Label>
                                    <Input id="adReward" name="adReward" type="number" step="0.1" defaultValue={appSettings?.adReward ?? 0.5} required />
                                </div>
                            </div>
                            <Button type="submit">Save Settings</Button>
                        </form>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="app-icon">
            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle>App Icon Management</CardTitle>
                    <CardDescription>Change the website favicon and PWA icon.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>Current Icon</Label>
                        <div className="mt-2 flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                            {isLoadingAppSettings ? <Skeleton className="h-16 w-16 rounded-md" /> : (
                                <div className="relative h-16 w-16">
                                  <Image src={appIconPreview ?? '/logo512.png'} alt="Current App Icon" layout="fill" className="rounded-md" />
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">This icon is shown in browser tabs and on mobile home screens.</p>
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="app-icon-upload">Upload New Icon</Label>
                        <div className="mt-2 flex items-center gap-4">
                            <input
                                ref={newAppIconRef}
                                id="app-icon-upload"
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml, image/x-icon"
                                className="hidden"
                                onChange={handleIconFileChange}
                            />
                            <Button type="button" variant="outline" onClick={() => newAppIconRef.current?.click()}>
                                Choose File
                            </Button>
                            {appIconPreview && newAppIcon && (
                                <div className="relative h-10 w-10">
                                  <Image src={appIconPreview} alt="New Icon Preview" layout="fill" className="rounded-md" />
                                </div>
                            )}
                            {newAppIcon && <p className="text-sm text-muted-foreground truncate">{newAppIcon.name}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveAppIcon} disabled={!newAppIcon || isUploadingIcon}>
                            {isUploadingIcon ? 'Uploading...' : 'Save Icon'}
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" disabled={isUploadingIcon}>
                                    <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will remove your custom uploaded icon and restore the default site logo.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetIcon}>Confirm Reset</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="admin-wallet">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Admin Wallet</CardTitle>
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoadingAppSettings ? <Skeleton className="h-8 w-32" /> : (appSettings?.adminWalletBalance || 0).toFixed(2)} Fair
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total fees collected from transactions.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Withdraw Fees</CardTitle>
                        <CardDescription>Transfer collected fees to any user account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleWithdrawFees} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Recipient Email</Label>
                                <Input id="email" name="email" type="email" placeholder="user@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
                            </div>
                            <Button type="submit">Withdraw</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="fund-management">
            <Card className="max-w-lg">
                <CardHeader>
                <CardTitle>Manage User Funds</CardTitle>
                <CardDescription>
                    Add a bonus or make a correction to a user's balance.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleAddFunds} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fund-email">Recipient Email</Label>
                        <Input
                            id="fund-email"
                            name="email"
                            type="email"
                            placeholder="user@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="asset-select">Asset</Label>
                         <Select name="asset" defaultValue="fair">
                            <SelectTrigger id="asset-select" className="bg-white text-black">
                                <SelectValue placeholder="Select asset" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fair">Fair</SelectItem>
                                <SelectItem value="usdt">USDT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fund-amount">Amount</Label>
                        <Input
                            id="fund-amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            placeholder="50.00"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fund-reason">Reason</Label>
                        <Textarea
                            id="fund-reason"
                            name="reason"
                            placeholder="e.g., Giveaway winner, Bug bounty, etc."
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">
                       <DollarSign className="mr-2 h-4 w-4" /> Add Funds
                    </Button>
                </form>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-roles">
            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle>Manage Admin Roles</CardTitle>
                    <CardDescription>
                        Promote users to admin or demote them back to user.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={async (e) => {
                      await handleRoleUpdateRequest(e);
                      setShowRoleConfirm(false);
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="role-email">User Email</Label>
                            <Input
                                id="role-email"
                                name="email"
                                type="email"
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role-select">Set Role</Label>
                            <select
                                id="role-select"
                                name="role"
                                defaultValue="user"
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <Input
                            type="password"
                            value={securityCode}
                            onChange={(e) => setSecurityCode(e.target.value)}
                            placeholder="Security Code"
                        />
                        <Button type="submit" className="w-full" disabled={securityCode !== '#012'}>
                            <UserCog className="mr-2 h-4 w-4" /> Update Role
                        </Button>
                    </form>
                </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="maintenance">
            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle>Maintenance Mode</CardTitle>
                    <CardDescription>
                        Temporarily put the site into maintenance mode for all non-admin users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                {isLoadingAppSettings ? <Skeleton className="h-20 w-full" /> : (
                    <>
                        <div className="flex items-center space-x-4 rounded-lg border p-4">
                            <Hammer className="h-6 w-6" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    Enable Maintenance Mode
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    If enabled, only admins can access the site.
                                </p>
                            </div>
                            <Switch
                                checked={appSettings?.maintenanceModeEnabled ?? false}
                                onCheckedChange={(checked) => handleUpdateSettings({ maintenanceMode: checked })}
                            />
                        </div>
                        {appSettings?.maintenanceModeEnabled && (
                             <Alert variant="destructive" className="mt-4">
                                <Hammer className="h-4 w-4" />
                                <AlertTitle>Maintenance Mode is Active</AlertTitle>
                                <AlertDescription>
                                    The site is currently not accessible to regular users.
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}
                </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </main>
    </div>
  );
}

    

    

    