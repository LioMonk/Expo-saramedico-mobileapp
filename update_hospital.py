import re

with open('Mobile/src/screens/hospital/HospitalDashboard.js', 'r') as f:
    content = f.read()

# 1. Update loadDashboard catch block
load_old = """            // Try to load dashboard stats (may not exist yet)
            try {
                const dashboardRes = await hospitalAPI.getDashboard();
                if (dashboardRes.data) {
                    setStats(dashboardRes.data);
                }
            } catch (e) {
                // Use demo stats if API not available
                setStats({
                    totalDoctors: 12,
                    totalPatients: 248,
                    todayAppointments: 18,
                    departments: 6,
                });
            }"""

load_new = """            // Try to load dashboard stats (may not exist yet)
            try {
                const dashboardRes = await hospitalAPI.getDashboard();
                if (dashboardRes.data) {
                    setStats(dashboardRes.data);
                }
            } catch (e) {
                console.log('Dashboard stats API not yet available on backend (404 expected). Returning 0 for stats.');
                setStats({
                    totalDoctors: 0,
                    totalPatients: 0,
                    todayAppointments: 0,
                    departments: 0,
                });
            }"""

content = content.replace(load_old, load_new)

# 2. Update Recent Activity Section
activity_old = """                    <View style={styles.activityCard}>
                        <View style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="person-add" size={20} color="#2196F3" />
                            </View>
                            <View style={styles.activityText}>
                                <Text style={styles.activityTitle}>New team member joined</Text>
                                <Text style={styles.activityTime}>2 hours ago</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            </View>
                            <View style={styles.activityText}>
                                <Text style={styles.activityTitle}>Appointment completed</Text>
                                <Text style={styles.activityTime}>4 hours ago</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="calendar" size={20} color="#FF9800" />
                            </View>
                            <View style={styles.activityText}>
                                <Text style={styles.activityTitle}>New appointment scheduled</Text>
                                <Text style={styles.activityTime}>Yesterday</Text>
                            </View>
                        </View>
                    </View>"""
                    
activity_new = """                    <View style={[styles.activityCard, { alignItems: 'center', paddingVertical: 30 }]}>
                        <Ionicons name="time-outline" size={48} color="#DDD" />
                        <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>No recent activity to display.</Text>
                    </View>"""

content = content.replace(activity_old, activity_new)

with open('Mobile/src/screens/hospital/HospitalDashboard.js', 'w') as f:
    f.write(content)
