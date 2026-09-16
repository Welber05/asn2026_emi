import Workspace from './workspace';
import {AuthGate} from './account-ui';
export default function Home(){return <AuthGate><Workspace/></AuthGate>;}
