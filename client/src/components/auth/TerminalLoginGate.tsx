import React from 'react';
import { LandingShowcasePage } from '../landing/LandingShowcasePage';

interface TerminalLoginGateProps {
  onLaunchDemo?: () => void;
}

export const TerminalLoginGate: React.FC<TerminalLoginGateProps> = ({
  onLaunchDemo = () => {}
}) => {
  return <LandingShowcasePage onLaunchDemo={onLaunchDemo} />;
};

export default TerminalLoginGate;
