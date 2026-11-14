import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, CheckCircle, XCircle } from "lucide-react";
import { format, isAfter } from "date-fns";

export default function AuthorityChain({ authorities }) {
  const isExpired = (validUntil) => {
    return isAfter(new Date(), new Date(validUntil));
  };

  const getStatusIcon = (authority) => {
    if (authority.status === 'revoked') return XCircle;
    if (isExpired(authority.valid_until)) return Clock;
    if (authority.status === 'active') return CheckCircle;
    return Shield;
  };

  const getStatusColor = (authority) => {
    if (authority.status === 'revoked') return 'text-red-500';
    if (isExpired(authority.valid_until)) return 'text-orange-500';
    if (authority.status === 'active') return 'text-green-500';
    return 'text-gray-500';
  };

  // Build delegation tree
  const buildTree = (authorities) => {
    const rootAuthorities = authorities.filter(a => !a.parent_authority_id);
    const childMap = {};
    
    authorities.forEach(auth => {
      if (auth.parent_authority_id) {
        if (!childMap[auth.parent_authority_id]) childMap[auth.parent_authority_id] = [];
        childMap[auth.parent_authority_id].push(auth);
      }
    });

    return { roots: rootAuthorities, childMap };
  };

  const { roots, childMap } = buildTree(authorities);

  const renderAuthority = (authority, depth = 0) => {
    const StatusIcon = getStatusIcon(authority);
    const statusColor = getStatusColor(authority);
    const children = childMap[authority.id] || [];

    return (
      <div key={authority.id} className="space-y-2">
        <div 
          className="flex items-start gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-all"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <StatusIcon className={`h-5 w-5 mt-0.5 ${statusColor}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{authority.grant_type}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {authority.scope.replace(/_/g, ' ')}
              </Badge>
              {authority.delegation_permitted && (
                <Badge className="text-xs bg-purple-100 text-purple-700">
                  Can Delegate
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-gray-600 mt-1">
              Granted to: <span className="font-medium">{authority.granted_to_user}</span>
            </div>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              <span>By: {authority.granted_by_user}</span>
              <span>•</span>
              <span className={isExpired(authority.valid_until) ? 'text-red-600 font-semibold' : ''}>
                Expires: {format(new Date(authority.valid_until), 'MMM d, yyyy HH:mm')}
              </span>
            </div>

            {authority.permitted_actions?.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {authority.permitted_actions.map(action => (
                  <Badge key={action} variant="secondary" className="text-xs">
                    {action.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {children.length > 0 && (
          <div className="ml-6 border-l-2 border-gray-200 pl-2">
            {children.map(child => renderAuthority(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authority Delegation Chain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {roots.length > 0 ? (
            roots.map(auth => renderAuthority(auth))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No active authorities. Declare emergency to grant authorities.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}