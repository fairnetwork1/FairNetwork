
'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, LogOut, Upload, CheckCircle, XCircle, AlertCircle, Edit, FileText, Info, BookText, Mail, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirebase, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from './ui/avatar';
import { countries } from '@/lib/countries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

const PrivacyPolicyDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-medium p-4 h-auto text-black bg-gray-100 rounded-lg hover:bg-gray-200">
        <Lock className="h-4 w-4 text-gray-500" />
        Privacy
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl bg-white">
      <DialogHeader>
        <DialogTitle className="text-black">Privacy Policy</DialogTitle>
        <DialogDescription>Last updated: {new Date().toLocaleDateString()}</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-6">
        <div className="text-sm text-gray-700 space-y-6">
          <p>FairNetwork.cloud (“we,” “our,” or “us”) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and protect information when you use our website and services.</p>
          
          <div>
            <h3 className="font-semibold text-lg text-black mb-2 flex items-center gap-2">🔹 1. Information We Collect</h3>
            <p className="mb-2">We may collect the following data:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>Name, username, and email address (during registration)</li>
              <li>Device and browser information</li>
              <li>Activity data (such as login time, referrals, and mining activity)</li>
              <li>Any KYC information you upload (if applicable)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-black mb-2 flex items-center gap-2">🔹 2. How We Use Your Information</h3>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>Create and manage your user account</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Track mining progress and rewards</li>
              <li>Improve user experience and website performance</li>
              <li>Communicate with you regarding updates or issues</li>
            </ul>
            <p className="mt-4 font-semibold">We never sell or share your personal data with third parties for marketing.</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-black mb-2 flex items-center gap-2">🔹 3. Data Storage & Security</h3>
            <p>All data is stored securely using Firebase and encrypted HTTPS connections. We take reasonable measures to protect your information from unauthorized access, alteration, or deletion.</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-black mb-2 flex items-center gap-2">🔹 4. Cookies</h3>
            <p>Our website may use cookies to remember user sessions and improve site performance. You can disable cookies through your browser settings, but some features may stop working properly.</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-black mb-2 flex items-center gap-2">🔹 5. KYC and Sensitive Information</h3>
            <p>If KYC verification is required, we collect and process your ID documents securely. Your KYC data is used only for verification purposes and is not shared externally.</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-black mb-2 flex items-center gap-2">🔹 6. Your Rights</h3>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>Access or request deletion of your data</li>
              <li>Update incorrect information</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </div>

        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

const TermsAndConditionsDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-medium p-4 h-auto text-black bg-gray-100 rounded-lg hover:bg-gray-200">
          <BookText className="h-4 w-4 text-gray-500" />
          Terms & Conditions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">Terms & Conditions</DialogTitle>
          <DialogDescription>Last updated: {new Date().toLocaleDateString()}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <div className="text-sm text-gray-700 space-y-4">
            <p>Welcome to Fair Network. By accessing or using our website (fairnetwork.cloud), you agree to comply with the following terms and conditions:</p>
            
            <div>
              <h3 className="font-semibold text-lg text-black mb-2">1. Eligibility</h3>
              <p>You must be at least 18 years old or have parental permission to use our platform.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">2. Account Responsibility</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>You are responsible for maintaining the security of your account.</li>
                <li>Any activity under your account will be considered your responsibility.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">3. Fair Use</h3>
               <ul className="list-disc list-inside space-y-1 pl-4">
                <li>You may not use bots, scripts, or automated tools to perform mining or referral activities.</li>
                <li>Violation may lead to suspension or permanent ban.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">4. KYC and Verification</h3>
              <p>Certain actions (such as withdrawals or higher-level rewards) may require KYC verification.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">5. Rewards and Airdrops</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Rewards are subject to verification and may change according to platform updates.</li>
                <li>The team reserves the right to adjust, pause, or modify the reward system at any time.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">6. Intellectual Property</h3>
              <p>All content, logos, and branding belong to Fair Network.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg text-black mb-2">7. Termination</h3>
              <p>We reserve the right to terminate or restrict access for any user found violating these terms.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">8. Limitation of Liability</h3>
              <p>Fair Network is not responsible for any financial loss, system errors, or misuse of user accounts.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-black mb-2">9. Updates</h3>
              <p>We may update these terms at any time. Continued use of the site means you accept any new terms.</p>
            </div>
            
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
);

const LitePaperDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-medium p-4 h-auto text-black bg-gray-100 rounded-lg hover:bg-gray-200">
          <FileText className="h-4 w-4 text-gray-500" />
          LitePaper
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">Fair Chain LitePaper</DialogTitle>
          <DialogDescription>Our vision, technology, and roadmap.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <div className="text-sm text-gray-700 space-y-6">
            
            <div>
              <h3 className="font-semibold text-xl text-black mb-2">Introduction</h3>
              <p>
                  Fair Network is an innovative blockchain project built to empower users through transparent, fair, and community-driven technology. Our mission is to create a decentralized ecosystem where every participant benefits equally from blockchain growth — starting with mining, airdrops, and progressing toward full-scale Web3 products.
              </p>
            </div>
            
            <Separator />

            <div>
              <h3 className="font-semibold text-xl text-black mb-2">Phase 1: Launch & Mining Platform</h3>
              <p className='mb-3'>
                  Fair Network has launched a mining-based website that allows users to participate and earn airdrops. This initial phase focuses on building a strong and active user base that will form the foundation of the Fair Network ecosystem.
              </p>
              <ul className="space-y-2">
                <li>✅ Website live with mining & reward system</li>
                <li>✅ User onboarding through airdrop incentives</li>
                <li>✅ Community growth and testing infrastructure</li>
              </ul>
            </div>
            
            <Separator />

            <div>
              <h3 className="font-semibold text-xl text-black mb-2">Phase 2: Blockchain Development (EVM-Based)</h3>
              <p className='mb-3'>
                  Fair Network’s own blockchain will be developed as an EVM-compatible chain, ensuring full support for Ethereum smart contracts, scalability, and cross-chain interoperability.
              </p>
              <ul className="space-y-2">
                <li>🔗 EVM-based chain for seamless DApp integration</li>
                <li>🔐 Secure, decentralized network infrastructure</li>
                <li>⚙️ Developer-friendly environment</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-xl text-black mb-2">Phase 3: Product Launch – “FairPad”</h3>
              <p className='mb-3'>
                  Fair Network will introduce FairPad, a next-generation decentralized launchpad designed to make token creation and fundraising fair, accessible, and transparent for all.
              </p>
              <p className='font-semibold mb-2'>FairPad Features:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>Token minting on multiple chains</li>
                  <li>Presale creation and management tools</li>
                  <li>Integrated swap system</li>
                  <li>Multi-chain launch support</li>
                  <li>Secure investor participation</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-xl text-black mb-2">Phase 4: Listing & Ecosystem Expansion</h3>
              <p className='mb-3'>
                  After the successful launch of FairPad, Fair Network will move toward official token listing and expansion across major blockchain ecosystems and exchanges.
              </p>
              <ul className="space-y-2">
                  <li>📈 Token listing on top exchanges</li>
                  <li>💹 Ecosystem partnerships and integrations</li>
                  <li>🌍 Cross-chain bridge for interoperability</li>
                  <li>🧩 Continuous product innovation</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-xl text-black mb-2">Our Vision</h3>
              <p>
                  To build a fair, community-owned blockchain ecosystem that empowers users and developers with real utility, transparency, and decentralized opportunity.
              </p>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
  
  const AboutDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-medium p-4 h-auto text-black bg-gray-100 rounded-lg hover:bg-gray-200">
          <Info className="h-4 w-4 text-gray-500" />
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-black">About Fair Chain</DialogTitle>
          <DialogDescription>Decentralizing the future, one block at a time.</DialogDescription>
        </DialogHeader>
        <div className="text-sm text-gray-700 space-y-4 py-4">
          <p>
            Fair Network is a next-generation blockchain initiative focused on building a transparent and community-driven ecosystem. Starting with mining and airdrops, Fair Network aims to deliver powerful blockchain solutions such as its own EVM-based chain and decentralized launchpad “FairPad.”
          </p>
          <p>
            Our goal is to ensure equal opportunity for all users — from miners and investors to developers and creators.
With future plans for token listing, partnerships, and continuous innovation, Fair Network is set to become a key player in the decentralized economy.
          </p>
          <p><strong>Version:</strong> 1.0.0</p>
        </div>
      </DialogContent>
    </Dialog>
  );

const ContactSupportDialog = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-medium p-4 h-auto text-black bg-gray-100 rounded-lg hover:bg-gray-200">
                <Mail className="h-4 w-4 text-gray-500" />
                Contact Support
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-white">
            <DialogHeader>
                <DialogTitle className="text-black text-2xl">Contact & Support</DialogTitle>
                <DialogDescription>
                    We're here to help you! If you have any issue related to your account, contact us anytime.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-sm space-y-6">
                <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <div>
                            <p className="font-semibold text-black">Email</p>
                             <a href="mailto:support@fairnetwork.cloud" className="text-blue-600 hover:underline">
                                support@fairnetwork.cloud
                            </a>
                        </div>
                   </div>
                   <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <div>
                             <p className="font-semibold text-black">Average Response</p>
                             <p className="text-gray-600">Within 24 hours</p>
                        </div>
                   </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold text-black mb-2">Please include:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Your registered email</li>
                        <li>Screenshot of the issue (if possible)</li>
                        <li>A short description of the problem</li>
                    </ul>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);


export function ProfileDrawer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { auth, firestore, user } = useFirebase();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const kycRequestRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'kyc_requests', user.uid);
  }, [user, firestore]);

  const { data: kycData } = useDoc(kycRequestRef);
  
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (kycData) {
      setFullName(kycData.fullName || (userData?.fullName || ''));
      setCountry(kycData.country || '');
    } else if (userData) {
      setFullName(userData.fullName || '');
    }
  }, [kycData, userData]);


  const fileFrontRef = useRef<HTMLInputElement>(null);
  const fileBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'front') setDocFront(file);
      else if (type === 'back') setDocBack(file);
      else setSelfie(file);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const storage = getStorage();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userDocRef || !kycRequestRef) return;
  
    const isFrontMissing = !docFront && !kycData?.idFrontImageUrl;
    const isBackMissing = !docBack && !kycData?.idBackImageUrl;
    const isSelfieMissing = !selfie && !kycData?.selfieImageUrl;
  
    if (isFrontMissing || isBackMissing || isSelfieMissing || !fullName || !country) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all fields and upload all required documents.',
      });
      return;
    }
    
    setIsSubmitting(true);
    toast({
      title: 'Submitting KYC...',
      description: 'Uploading documents and saving data. Please wait.',
    });
  
    try {
      const basePath = `kyc/${user.uid}`;
      let idFrontImageUrl = kycData?.idFrontImageUrl;
      let idBackImageUrl = kycData?.idBackImageUrl;
      let selfieImageUrl = kycData?.selfieImageUrl;
  
      if (docFront) {
        idFrontImageUrl = await uploadFile(docFront, `${basePath}/id_front_${docFront.name}`);
      }
      if (docBack) {
        idBackImageUrl = await uploadFile(docBack, `${basePath}/id_back_${docBack.name}`);
      }
      if (selfie) {
        selfieImageUrl = await uploadFile(selfie, `${basePath}/selfie_${selfie.name}`);
      }
  
      if (!idFrontImageUrl || !idBackImageUrl || !selfieImageUrl) {
        throw new Error("A critical document URL is missing after upload attempts.");
      }
  
      const kycRequestData = {
        userId: user.uid,
        email: user.email,
        fullName,
        country,
        idFrontImageUrl,
        idBackImageUrl,
        selfieImageUrl,
        status: 'pending',
        submittedAt: serverTimestamp(),
        rejectionReason: '',
      };
      
      const batch = writeBatch(firestore);
      batch.set(kycRequestRef, kycRequestData, { merge: true });
      batch.update(userDocRef, { kycStatus: 'pending', fullName: fullName });
      
      await batch.commit();
  
      toast({
        title: '✅ Submission Successful!',
        description: 'Your KYC documents have been submitted for review.',
      });
      setIsEditing(false);
  
    } catch(error: any) {
      console.error("KYC Submission error: ", error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Could not save your KYC data. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const kycStatusText = 'Unverified';
  const kycStatusVariant = 'destructive';
  const kycStatusIcon = <XCircle className="w-5 h-5 text-red-500" />;

  const FileUploadInput = ({
    doc,
    side,
    onFileChange,
    fileRef,
    disabled,
    existingImageUrl,
  }: {
    doc: File | null;
    side: 'front' | 'back' | 'selfie';
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => void;
    fileRef: React.RefObject<HTMLInputElement>;
    disabled?: boolean;
    existingImageUrl?: string;
  }) => (
    <div className='w-full'>
      <input
        type="file"
        ref={fileRef}
        className="hidden"
        accept="image/png, image/jpeg"
        onChange={(e) => onFileChange(e, side)}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2 text-left h-auto py-2 text-black bg-white border-gray-300"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col w-full truncate">
          <span className="font-semibold capitalize">{side === 'selfie' ? 'Selfie' : `${side} Side`}</span>
          {doc ? (
            <span className="text-xs text-gray-500 truncate">{doc.name}</span>
          ) : existingImageUrl ? (
            <span className="text-xs text-green-600 truncate">Image uploaded</span>
          ) : (
            <span className="text-xs text-gray-500">Upload Image</span>
          )}
        </div>
      </Button>
    </div>
  );

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        toast({ title: "Logged Out" });
        router.push('/');
      }).catch((error) => {
        toast({ variant: 'destructive', title: "Logout Failed", description: error.message });
      });
    }
  };

  const nameInitial = userData?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';
  
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-full h-full flex flex-col p-0 sm:max-w-full bg-white">
        <SheetHeader className="text-left p-6 border-b">
          <div className="flex items-center gap-4">
            <Avatar className='h-12 w-12'>
              <AvatarFallback className='text-lg font-bold bg-blue-100 text-blue-600'>
                {nameInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-lg text-black">{userData?.fullName || ''}</SheetTitle>
              <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </SheetHeader>
        
        <div className='flex-grow overflow-auto p-6'>
          <h3 className='text-lg font-semibold mb-4 flex items-center gap-2 text-black'><FileText className="h-5 w-5" />Identity Verification (KYC)</h3>
          
          <div className='flex items-center gap-2 mb-4 p-3 rounded-lg bg-gray-100'>
            {kycStatusIcon}
            <span className='font-semibold text-black'>Status:</span>
            <Badge variant={kycStatusVariant}>{kycStatusText}</Badge>
          </div>

          <div className='text-center p-8 border rounded-lg bg-gray-50/50'>
              <p className='text-gray-500 mb-4'>
                This feature is coming soon. Please check back later.
              </p>
              <Button disabled className="text-white">
                Start Verification
              </Button>
            </div>

          <Separator className="my-6" />
            <div className='space-y-3'>
                <LitePaperDialog />
                <AboutDialog />
                <PrivacyPolicyDialog />
                <TermsAndConditionsDialog />
                <ContactSupportDialog />
            </div>

        </div>
        
        <div className="mt-auto p-6 border-t">
            <Button onClick={handleLogout} variant="outline" className="w-full justify-center text-center items-center h-9 rounded-md px-3 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

    