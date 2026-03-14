import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from './TenantContext';

const EventContext = createContext();

export const useEvent = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
    const { tenantId } = useTenant();
    const [activeEvent, setActiveEvent] = useState(null);
    const [availableEvents, setAvailableEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Persist active event in session storage
    useEffect(() => {
        const savedEvent = sessionStorage.getItem('active_event');
        if (savedEvent) {
            try {
                setActiveEvent(JSON.parse(savedEvent));
            } catch (e) {
                console.error("Failed to parse saved event", e);
            }
        }
    }, []);

    const fetchEvents = async () => {
        if (!tenantId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAvailableEvents(data || []);
        } catch (e) {
            console.error("Error fetching events:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const selectEvent = (event) => {
        setActiveEvent(event);
        if (event) {
            sessionStorage.setItem('active_event', JSON.stringify(event));
        } else {
            sessionStorage.removeItem('active_event');
        }
    };

    return (
        <EventContext.Provider
            value={{
                activeEvent,
                activeEventId: activeEvent?.id || null,
                availableEvents,
                isLoading,
                fetchEvents,
                selectEvent,
                hasActiveEvent: !!activeEvent
            }}
        >
            {children}
        </EventContext.Provider>
    );
};
