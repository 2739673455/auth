import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Users, Shield, Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { adminUserApi, adminGroupApi, adminScopeApi } from '../../api/admin';
import { useAuthStore } from '../../stores/authStore';

interface UserInfo { id: number; username: string; email: string; yn: number; }
interface GroupInfo { id: number; name: string; yn: number; }
interface ScopeInfo { id: number; name: string; yn: number; }

interface FilterState {
  userId: number | null;
  groupId: number | null;
  scopeId: number | null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [scopes, setScopes] = useState<ScopeInfo[]>([]);
  const [filter, setFilter] = useState<FilterState>({ userId: null, groupId: null, scopeId: null });

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, groupsRes, scopesRes] = await Promise.all([
        adminUserApi.listUsers({}),
        adminGroupApi.listGroups({}),
        adminScopeApi.listScopes({}),
      ]);
      setUsers(usersRes.data.items);
      setGroups(groupsRes.data.items);
      setScopes(scopesRes.data.items);
    } catch (error: any) {
      if (error.response?.status === 401) {
        await logout();
        navigate('/login');
      } else {
        toast.error('获取数据失败');
      }
    }
  }, [logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteUser = async (id: number) => {
    if (!confirm('确定删除该用户？')) return;
    try {
      await adminUserApi.removeUser({ user_id: id });
      toast.success('删除成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '删除失败');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('确定删除该组？')) return;
    try {
      await adminGroupApi.removeGroup({ group_id: id });
      toast.success('删除成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '删除失败');
    }
  };

  const handleDeleteScope = async (id: number) => {
    if (!confirm('确定删除该权限？')) return;
    try {
      await adminScopeApi.removeScope({ scope_id: id });
      toast.success('删除成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="h-14 bg-background border-b flex items-center px-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <h1 className="ml-4 text-lg font-semibold">管理面板</h1>
      </header>

      <main className="p-6 grid grid-cols-3 gap-6">
        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              用户
              {filter.userId && <Badge variant="secondary">筛选中</Badge>}
            </CardTitle>
            <Button size="sm" onClick={() => toast.info('新建用户功能待实现')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input placeholder="搜索用户" />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className={filter.userId === user.id ? 'bg-blue-50' : user.yn === 0 ? 'opacity-50' : ''}
                    onClick={() => setFilter(f => ({ ...f, userId: f.userId === user.id ? null : user.id }))}
                  >
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toast.info('编辑功能待实现'); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Groups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              组
              {filter.groupId && <Badge variant="secondary">筛选中</Badge>}
            </CardTitle>
            <Button size="sm" onClick={() => toast.info('新建组功能待实现')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input placeholder="搜索组" />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow 
                    key={group.id}
                    className={filter.groupId === group.id ? 'bg-blue-50' : group.yn === 0 ? 'opacity-50' : ''}
                    onClick={() => setFilter(f => ({ ...f, groupId: f.groupId === group.id ? null : group.id }))}
                  >
                    <TableCell>{group.id}</TableCell>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toast.info('编辑功能待实现'); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Scopes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              权限
              {filter.scopeId && <Badge variant="secondary">筛选中</Badge>}
            </CardTitle>
            <Button size="sm" onClick={() => toast.info('新建权限功能待实现')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input placeholder="搜索权限" />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopes.map((scope) => (
                  <TableRow 
                    key={scope.id}
                    className={filter.scopeId === scope.id ? 'bg-blue-50' : scope.yn === 0 ? 'opacity-50' : ''}
                    onClick={() => setFilter(f => ({ ...f, scopeId: f.scopeId === scope.id ? null : scope.id }))}
                  >
                    <TableCell>{scope.id}</TableCell>
                    <TableCell>{scope.name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toast.info('编辑功能待实现'); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteScope(scope.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Filter Bar */}
      {(filter.userId || filter.groupId || filter.scopeId) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <span className="text-sm text-muted-foreground">当前筛选:</span>
          {filter.userId && <Badge>用户: {users.find(u => u.id === filter.userId)?.username}</Badge>}
          {filter.groupId && <Badge>组: {groups.find(g => g.id === filter.groupId)?.name}</Badge>}
          {filter.scopeId && <Badge>权限: {scopes.find(s => s.id === filter.scopeId)?.name}</Badge>}
          <Button variant="ghost" size="sm" onClick={() => setFilter({ userId: null, groupId: null, scopeId: null })}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
