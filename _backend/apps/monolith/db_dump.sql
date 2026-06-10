--
-- PostgreSQL database dump
--

\restrict rg68GWEh5RuzgqJF9Sd2nSo6eP033963h9WyhDXEA6Ag7dGNcWZBx4ebTcaaLGo

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    provider character varying NOT NULL,
    "providerID" character varying NOT NULL
);


ALTER TABLE public.accounts OWNER TO jaroslav_user;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO jaroslav_user;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: action_done_component_map; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.action_done_component_map (
    event_action_done_id integer NOT NULL,
    component_mounted_id integer NOT NULL
);


ALTER TABLE public.action_done_component_map OWNER TO jaroslav_user;

--
-- Name: action_service_intervals; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.action_service_intervals (
    id integer CONSTRAINT component_service_intervals_id_not_null NOT NULL,
    service_interval_km integer,
    service_interval_h integer,
    event_actions_id integer NOT NULL,
    health_index_interval integer
);


ALTER TABLE public.action_service_intervals OWNER TO jaroslav_user;

--
-- Name: events_action; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.events_action (
    id integer CONSTRAINT action_types_id_not_null NOT NULL,
    action_name character varying NOT NULL,
    replace_action boolean DEFAULT false NOT NULL,
    user_id integer,
    req_front_suspension boolean DEFAULT false NOT NULL,
    req_rear_suspension boolean DEFAULT false NOT NULL,
    warning_message character varying
);


ALTER TABLE public.events_action OWNER TO jaroslav_user;

--
-- Name: action_types_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.action_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.action_types_id_seq OWNER TO jaroslav_user;

--
-- Name: action_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.action_types_id_seq OWNED BY public.events_action.id;


--
-- Name: bike_brands; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.bike_brands (
    id integer CONSTRAINT bike_details_id_not_null NOT NULL,
    bike_brand character varying NOT NULL
);


ALTER TABLE public.bike_brands OWNER TO jaroslav_user;

--
-- Name: bike_brands_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

ALTER TABLE public.bike_brands ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bike_brands_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: components_mounted; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.components_mounted (
    id integer CONSTRAINT bike_components_id_not_null NOT NULL,
    bike_id integer NOT NULL,
    component_type_id integer NOT NULL,
    mounted_at timestamp with time zone,
    removed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    note text,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    component_desc character varying,
    "position" character varying,
    total_km integer,
    total_time_min integer DEFAULT 0,
    health_index integer
);


ALTER TABLE public.components_mounted OWNER TO jaroslav_user;

--
-- Name: bike_components_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_components_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_components_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_components_id_seq OWNED BY public.components_mounted.id;


--
-- Name: bike_details_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_details_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_details_id_seq OWNED BY public.bike_brands.id;


--
-- Name: bike_event_attachments; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.bike_event_attachments (
    id integer NOT NULL,
    bike_event_id integer NOT NULL,
    name character varying NOT NULL,
    url character varying NOT NULL,
    content_type character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bike_event_attachments OWNER TO jaroslav_user;

--
-- Name: bike_event_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_event_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_event_attachments_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_event_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_event_attachments_id_seq OWNED BY public.bike_event_attachments.id;


--
-- Name: events_bikes; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.events_bikes (
    id integer CONSTRAINT bike_events_id_not_null NOT NULL,
    bike_id integer,
    note text,
    total_cost numeric(10,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone
);


ALTER TABLE public.events_bikes OWNER TO jaroslav_user;

--
-- Name: bike_events_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_events_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_events_id_seq OWNED BY public.events_bikes.id;


--
-- Name: bike_models; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.bike_models (
    id integer NOT NULL,
    model_name character varying(255) NOT NULL,
    brand_id integer NOT NULL
);


ALTER TABLE public.bike_models OWNER TO jaroslav_user;

--
-- Name: bike_models_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_models_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_models_id_seq OWNED BY public.bike_models.id;


--
-- Name: bike_sizes; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.bike_sizes (
    id integer NOT NULL,
    size character varying
);


ALTER TABLE public.bike_sizes OWNER TO jaroslav_user;

--
-- Name: bike_sizes_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_sizes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_sizes_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_sizes_id_seq OWNED BY public.bike_sizes.id;


--
-- Name: bike_types; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.bike_types (
    id integer NOT NULL,
    type character varying
);


ALTER TABLE public.bike_types OWNER TO jaroslav_user;

--
-- Name: bike_types_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bike_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_types_id_seq OWNER TO jaroslav_user;

--
-- Name: bike_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bike_types_id_seq OWNED BY public.bike_types.id;


--
-- Name: bikes; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.bikes (
    id integer NOT NULL,
    bike_type_id integer,
    year integer,
    wheel_size_id integer,
    bike_size_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    frame_material character varying(50),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    bikename character varying(50),
    description character varying(255),
    bike_brand character varying(255) NOT NULL,
    bike_model character varying(255),
    user_id integer NOT NULL,
    organization_id integer,
    image_url character varying,
    ride_style_id integer,
    ebike boolean DEFAULT false NOT NULL,
    has_front_suspension boolean DEFAULT false NOT NULL,
    has_rear_suspension boolean DEFAULT false NOT NULL,
    total_km integer,
    total_time_min integer
);


ALTER TABLE public.bikes OWNER TO jaroslav_user;

--
-- Name: bikes_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.bikes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bikes_id_seq OWNER TO jaroslav_user;

--
-- Name: bikes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.bikes_id_seq OWNED BY public.bikes.id;


--
-- Name: component_groups; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.component_groups (
    id integer NOT NULL,
    group_name character varying NOT NULL,
    side_choice boolean DEFAULT false NOT NULL
);


ALTER TABLE public.component_groups OWNER TO jaroslav_user;

--
-- Name: component_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

ALTER TABLE public.component_groups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.component_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: component_service_intervals_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.component_service_intervals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.component_service_intervals_id_seq OWNER TO jaroslav_user;

--
-- Name: component_service_intervals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.component_service_intervals_id_seq OWNED BY public.action_service_intervals.id;


--
-- Name: component_types; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.component_types (
    id integer NOT NULL,
    component_type character varying NOT NULL,
    ebike boolean DEFAULT false NOT NULL,
    component_group_id integer NOT NULL,
    has_position boolean DEFAULT false NOT NULL,
    user_id integer
);


ALTER TABLE public.component_types OWNER TO jaroslav_user;

--
-- Name: component_types_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.component_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.component_types_id_seq OWNER TO jaroslav_user;

--
-- Name: component_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.component_types_id_seq OWNED BY public.component_types.id;


--
-- Name: event_action_tags; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.event_action_tags (
    id integer NOT NULL,
    event_action_id integer NOT NULL,
    event_action_tag character varying CONSTRAINT event_action_tags_event_action_tags_not_null NOT NULL
);


ALTER TABLE public.event_action_tags OWNER TO jaroslav_user;

--
-- Name: event_action_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

ALTER TABLE public.event_action_tags ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.event_action_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: event_action_targets; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.event_action_targets (
    id integer NOT NULL,
    event_action_id integer NOT NULL,
    component_type_id integer CONSTRAINT event_action_targets_components_mounted_id_not_null NOT NULL
);


ALTER TABLE public.event_action_targets OWNER TO jaroslav_user;

--
-- Name: event_action_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

ALTER TABLE public.event_action_targets ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.event_action_targets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: event_actions_done; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.event_actions_done (
    id integer NOT NULL,
    bike_event_id integer NOT NULL,
    event_action_id integer NOT NULL,
    note text,
    partial_cost numeric(10,2),
    part_replaced boolean DEFAULT false,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    bike_mileage_at_time integer,
    bike_minutes_at_time integer
);


ALTER TABLE public.event_actions_done OWNER TO jaroslav_user;

--
-- Name: event_actions_done_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.event_actions_done_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_actions_done_id_seq OWNER TO jaroslav_user;

--
-- Name: event_actions_done_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.event_actions_done_id_seq OWNED BY public.event_actions_done.id;


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.organization_members (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    organization_id integer NOT NULL
);


ALTER TABLE public.organization_members OWNER TO jaroslav_user;

--
-- Name: organization_members_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.organization_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_members_id_seq OWNER TO jaroslav_user;

--
-- Name: organization_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.organization_members_id_seq OWNED BY public.organization_members.id;


--
-- Name: organization_roles; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.organization_roles (
    id integer NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    sort_order integer,
    description text
);


ALTER TABLE public.organization_roles OWNER TO jaroslav_user;

--
-- Name: organization_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.organization_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_roles_id_seq OWNER TO jaroslav_user;

--
-- Name: organization_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.organization_roles_id_seq OWNED BY public.organization_roles.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone
);


ALTER TABLE public.organizations OWNER TO jaroslav_user;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO jaroslav_user;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    refresh_token character varying(255) CONSTRAINT refresh_tokens_jwt_token_not_null NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp with time zone,
    user_agent character varying(255),
    ip_address character varying(100)
);


ALTER TABLE public.refresh_tokens OWNER TO jaroslav_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO jaroslav_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: ride_styles; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.ride_styles (
    id integer NOT NULL,
    ride_style character varying
);


ALTER TABLE public.ride_styles OWNER TO jaroslav_user;

--
-- Name: ride_styles_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.ride_styles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ride_styles_id_seq OWNER TO jaroslav_user;

--
-- Name: ride_styles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.ride_styles_id_seq OWNED BY public.ride_styles.id;


--
-- Name: rides; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.rides (
    id integer NOT NULL,
    bike_id integer NOT NULL,
    user_id integer NOT NULL,
    started_at timestamp with time zone,
    duration_sec integer,
    distance_m integer,
    elevation_down_m integer,
    elevation_up_m integer,
    speed_down integer,
    speed_avg integer,
    braking_load_score integer,
    max_speed_kmh integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone
);


ALTER TABLE public.rides OWNER TO jaroslav_user;

--
-- Name: rides_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.rides_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rides_id_seq OWNER TO jaroslav_user;

--
-- Name: rides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.rides_id_seq OWNED BY public.rides.id;


--
-- Name: suspension_setup; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.suspension_setup (
    id integer NOT NULL,
    mounted_component_id integer NOT NULL,
    setup_date time with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pressure_psi integer,
    pressure_bar integer,
    sag_percentage integer,
    amount_tokens_spacers integer,
    rebound_ls integer,
    rebound_hs integer,
    compression_ls integer,
    compression_hs integer,
    notes character varying
);


ALTER TABLE public.suspension_setup OWNER TO jaroslav_user;

--
-- Name: suspension_setup_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

ALTER TABLE public.suspension_setup ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.suspension_setup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tire_setup; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.tire_setup (
    id integer NOT NULL,
    component_mounted_id integer NOT NULL,
    tire_pressure_bar integer,
    tire_pressure_psi integer
);


ALTER TABLE public.tire_setup OWNER TO jaroslav_user;

--
-- Name: tire_setup_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

ALTER TABLE public.tire_setup ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tire_setup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying,
    email character varying NOT NULL,
    password_hash character varying,
    avatar_url character varying,
    language character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp with time zone,
    currency character varying,
    weight_kg integer,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    "googleId" character varying
);


ALTER TABLE public.users OWNER TO jaroslav_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO jaroslav_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wheel_sizes; Type: TABLE; Schema: public; Owner: jaroslav_user
--

CREATE TABLE public.wheel_sizes (
    id integer NOT NULL,
    size character varying
);


ALTER TABLE public.wheel_sizes OWNER TO jaroslav_user;

--
-- Name: wheel_sizes_id_seq; Type: SEQUENCE; Schema: public; Owner: jaroslav_user
--

CREATE SEQUENCE public.wheel_sizes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wheel_sizes_id_seq OWNER TO jaroslav_user;

--
-- Name: wheel_sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jaroslav_user
--

ALTER SEQUENCE public.wheel_sizes_id_seq OWNED BY public.wheel_sizes.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: action_service_intervals id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.action_service_intervals ALTER COLUMN id SET DEFAULT nextval('public.component_service_intervals_id_seq'::regclass);


--
-- Name: bike_event_attachments id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_event_attachments ALTER COLUMN id SET DEFAULT nextval('public.bike_event_attachments_id_seq'::regclass);


--
-- Name: bike_models id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_models ALTER COLUMN id SET DEFAULT nextval('public.bike_models_id_seq'::regclass);


--
-- Name: bike_sizes id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_sizes ALTER COLUMN id SET DEFAULT nextval('public.bike_sizes_id_seq'::regclass);


--
-- Name: bike_types id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_types ALTER COLUMN id SET DEFAULT nextval('public.bike_types_id_seq'::regclass);


--
-- Name: bikes id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes ALTER COLUMN id SET DEFAULT nextval('public.bikes_id_seq'::regclass);


--
-- Name: component_types id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.component_types ALTER COLUMN id SET DEFAULT nextval('public.component_types_id_seq'::regclass);


--
-- Name: components_mounted id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.components_mounted ALTER COLUMN id SET DEFAULT nextval('public.bike_components_id_seq'::regclass);


--
-- Name: event_actions_done id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_actions_done ALTER COLUMN id SET DEFAULT nextval('public.event_actions_done_id_seq'::regclass);


--
-- Name: events_action id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_action ALTER COLUMN id SET DEFAULT nextval('public.action_types_id_seq'::regclass);


--
-- Name: events_bikes id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_bikes ALTER COLUMN id SET DEFAULT nextval('public.bike_events_id_seq'::regclass);


--
-- Name: organization_members id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_members ALTER COLUMN id SET DEFAULT nextval('public.organization_members_id_seq'::regclass);


--
-- Name: organization_roles id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_roles ALTER COLUMN id SET DEFAULT nextval('public.organization_roles_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: ride_styles id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.ride_styles ALTER COLUMN id SET DEFAULT nextval('public.ride_styles_id_seq'::regclass);


--
-- Name: rides id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.rides ALTER COLUMN id SET DEFAULT nextval('public.rides_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wheel_sizes id; Type: DEFAULT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.wheel_sizes ALTER COLUMN id SET DEFAULT nextval('public.wheel_sizes_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.accounts (id, "userId", provider, "providerID") FROM stdin;
\.


--
-- Data for Name: action_done_component_map; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.action_done_component_map (event_action_done_id, component_mounted_id) FROM stdin;
3	77
4	190
5	77
6	191
\.


--
-- Data for Name: action_service_intervals; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.action_service_intervals (id, service_interval_km, service_interval_h, event_actions_id, health_index_interval) FROM stdin;
\.


--
-- Data for Name: bike_brands; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_brands (id, bike_brand) FROM stdin;
8993	Canyon
8994	Scott
8995	Superior
8996	24seven
8997	333Fab
8998	3G
8999	3T
9000	3rd Eye
9001	3rensho
9002	45North
9003	4ZA
9004	4iiii
9005	6KU
9006	9 zero 7
9007	A-Class
9008	A-bike
9009	A2B e-bikes
9010	ABI
9011	ACS
9012	AGang
9013	AIMA E-Bike
9014	ALAN
9015	AMF
9016	AVANTREK
9017	AXA
9018	Aardvark
9019	Abici
9020	Abus
9021	Accelerade
9022	Accell
9023	Access
9024	Acros
9025	Acstar
9026	Actbest
9027	Adams (Trail a bike)
9028	Addmotor
9029	Adolphe Clément
9030	Advantrek
9031	Adventure Medical Kits
9032	Advocate
9033	Aegis
9034	Aerofix Cycles
9035	Affinity Cycles
9036	AheadSet
9037	Airborne
9038	Aladdin
9039	Alchemy
9040	Alcyon
9041	Alex
9042	Alexander Leutner & Co.
9043	Alien Bikes
9044	Alienation
9045	Alite Designs
9046	All City
9047	Alldays & Onions
9048	Alliance
9049	Allied Cycle Works
9050	Alter Lock
9051	Alton
9052	American Bicycle Group
9053	American Classic
9054	American Machine and Foundry
9055	American Star Bicycle
9056	Amoeba
9057	Ancheer
9058	And
9059	Andiamo
9060	Answer BMX
9061	Apache Bicycles
9062	Apollo
9063	Aqua Sphere
9064	Aquamira
9065	Arai
9066	Ares
9067	Argo Cargo Bike
9068	Argon 18
9069	Asama
9070	Assos
9071	Atala
9072	Atomlab
9073	Author
9074	Avalon
9075	Avanti
9076	Aventón
9077	Avenue
9078	Avid
9079	Axiom
9080	Axle Release
9081	Azonic
9082	Azor
9083	Aztec
9084	Azub
9085	Azuki
9086	Azzuri
9087	BBF
9088	BBG Bashguard
9089	BCA
9090	BETD
9091	BH Bikes (Beistegui Hermanos)
9092	BMC (BMC Switzerland)
9093	BOB
9094	BONT
9095	BOX
9096	BSA
9097	BSD
9098	BSP
9099	BULLS Bikes
9100	Bacchetta
9101	Bachetta
9102	Backpacker's Pantry
9103	Backward Circle
9104	Badger Bikes
9105	Bafang
9106	Bahco
9107	Bailey
9108	Bakfiets
9109	Baladeo
9110	Bamboocycles
9111	Banjo Brothers
9112	Banshee Bikes
9113	Bantam (Bantam Bicycle Works)
9114	Bar Mitts
9115	Barracuda
9116	Basso
9117	Batavus
9118	Batch Bicycles
9119	Bazooka
9120	BeOne
9121	Bearclaw Bicycle Co.
9122	Beater Bikes
9123	Belize
9124	Bell
9125	Bellwether
9126	Benelli
9127	Benno
9128	Benotto
9129	Bergamont
9130	Bertin
9131	Bertoni
9132	Bertucci
9133	Bianchi
9134	Bickerton
9135	Bicycle Research
9136	Big Agnes Inc
9137	Big Cat Bikes
9138	Big Shot
9139	Bike Fit Systems
9140	Bike Friday
9141	Bike Guard
9142	Bike Mielec
9143	Bike Ribbon
9144	Bike-Aid
9145	Bike-Eye
9146	Bike-O-Vision
9147	Bike4Life
9148	BikeE recumbents
9149	Bikes Belong
9150	Bikeverywhere
9151	Biktrix
9152	Bilda
9153	Bilenky Cycle Works
9154	Bintelli
9155	Biomega
9156	BionX
9157	Birdy
9158	Biria
9159	Birmingham Small Arms Company
9160	Bishop
9161	Black Diamond
9162	Black Heart Bike Co
9163	Black Market
9164	Black Mountain Cycles
9165	Black Sheep Bikes
9166	Blackburn
9167	Blix
9168	Blue (Blue Competition Cycles)
10046	RST
9169	Blue Sky Cycle Carts
9170	Boardman Bikes
9171	Bobbin
9172	BodyGlide
9173	Boeshield
9174	Bohemian Bicycles
9175	Bombtrack
9176	Bondhus
9177	Bonk Breaker
9178	Bontrager
9179	Boo Bicycles
9180	Boreal
9181	Borealis (Borealis Fat Bikes)
9182	Boreas Gear
9183	Borile
9184	Bosch
9185	Bottecchia
9186	Boulder Bicycles
9187	Brand-X
9188	Brannock Device Co.
9189	Brave Soldier
9190	Breadwinner
9191	Breakbrake17 Bicycle Co.
9192	Breezer
9193	Brennabor
9194	Bridgestone
9195	Brilliant Bicycle
9196	Brinks Locks
9197	British Eagle
9198	Broakland
9199	Brodie
9200	Broke Bikes
9201	Brompton Bicycle
9202	Brooklyn Bicycle Co.
9203	Brooks England LTD.
9204	Brother Cycles
9205	Browning
9206	Brunswick Corporation
9207	Brush Research
9208	Budnitz
9209	Buff
9210	Bunch Bikes
9211	Burley
9212	Burley Design
9213	Busch + Müller (Busch and Muller)
9214	Bushnell
9215	Buzzy's
9216	CCM
9217	CDI Torque Products
9218	CETMA Cargo
9219	CHUMBA USA
9220	CRUD
9221	CST
9222	CVLN (Civilian)
9223	CX Tape
9224	Caffelatex
9225	Calcott Brothers
9226	Calfee Design
9227	California Springs
9228	Caloi
9229	Camelbak
9230	Camillus
9231	Campagnolo
9232	Campion Cycle Company
9233	Cane Creek
9234	Canfield Brothers
9235	Cannondale
9236	Cardiff
9237	Carmichael Training Systems
9238	Carrera bicycles
9239	Carrol Cycles
9240	Carver
9241	CatEye
9242	Catrike
9243	Cayne
9244	Centurion
9245	CeramicSpeed
9246	Cero
9247	Cervélo
9248	Chadwick
9249	Challenge
9250	Charge
9251	Chariot
9252	Chase
9253	Chater-Lea
9254	Checker Pig
9255	Chicago Bicycle Company
9256	Chris King
9257	Christiania Bikes
9258	Chromag
9259	Cicielios
9260	Cicli Barco
9261	Cicli Olympia
9262	Cielo
9263	Cignal
9264	Cilo
9265	Cinelli
9266	Ciocc
9267	Circa Cycles
9268	Citizen Bike
9269	City Bicycles Company
9270	Civia
9271	Clark-Kent
9272	Claud Butler
9273	Clean Bottle
9274	Cleary Bikes
9275	Cloud Nine
9276	Club Roost
9277	Co-Motion
9278	Coboc
9279	Colnago
9280	Colony
9281	Colossi
9282	Columbia
9283	Columbus Tubing
9284	Commencal Bikes
9285	Competition Cycles Services
9286	Concord Recreation
9287	Condor
9288	Conex
9289	Conor
9290	Continental
9291	Contour Sport
9292	Convercycle
9293	Cook Bros. Racing
9294	Cooper Bikes
9295	Corima
9296	Corratec
9297	Cortina Cycles
9298	Cove
9299	Craft
9300	Crank Brothers
9301	Crank2
9302	Crazy Creek
9303	Create
9304	Creme Cycles
9305	Crescent Moon
9306	Crew
9307	Critical Cycles
9308	Crumpton
9309	Crust Bikes
9310	Cruzbike
9311	Cube
9312	CueClip
9313	Cuevas
9314	Cult
9315	Currie Technology (Currietech)
9316	Currys
9317	Curtlo
9318	Custom
9319	Cyclamatic
9320	Cycle Dog
9321	Cycle Force Group
9322	Cycle Kids
9323	Cycle Stuff
9324	CycleAware
9325	CycleOps
9326	CyclePro
9327	Cycles Fanatic
9328	Cycles Follis
9329	Cycles Toussaint
9330	Cycleurope
9331	Cyclo
9332	Cycloc
9333	Cyfac
9334	CygoLite
9335	Cyrusher
9336	Cytosport
9337	DAJO
9338	DEAN
9339	DHS
9340	DIG BMX
9341	DK Bikes
9342	DMR Bikes
9343	DNP
9344	DOST
9345	DT Swiss
9346	DYU
9347	DZ Nuts
9348	Da Bomb Bikes
9349	Daccordi
9350	Dahon
9351	Dartmoor
9352	Davidson
9353	Dawes Cycles
9354	De Rosa
9355	DeBernardi
9356	DeFeet
9357	DeSalvo Cycles
9358	Decathlon
9359	Deco
9360	Deda Elementi
9361	Deity
9362	Del Sol
9363	Della Santa
9364	Delta
9365	Deluxe
9366	Demolition
9367	Den Beste Sykkel
9368	Dengfu
9369	Derby Cycle
9370	Dermatone
9371	Dero
9372	Detroit Bikes
9373	Deuter
9374	Devinci
9375	Devron
9376	Di Blasi Industriale
9377	Dia-Compe
9378	DiaTech
9379	Diadora
9380	Diamant
9381	Diamondback
9382	Dicta
9383	Dillenger
9384	Dimension
9385	DirtySixer
9386	Discwing
9387	Dobermann
9388	Dodici Milano
9389	Dolan
9390	Donnelly
9391	Dorel Industries
9392	Downtube
9393	Drag
9394	Dual Eyewear
9395	Dualco
9396	Dynacraft
9397	Dynamic Bicycles
9398	Dyno
9399	E-Case
9400	E-Lux
9401	E. C. Stearns Bicycle Agency
9402	EAI (Euro Asia Imports)
9403	EBC
9404	EG Bikes (Metronome)
9405	EGO Movement
9406	EK USA
9407	EMC Bikes
9408	ENVE (ENVE Composites)
9409	ESI
9410	EVS Sports
9411	EZ Pedaler (EZ Pedaler electric bikes)
9412	Eagle Bicycle
9413	Eagles Nest Outfitters
9414	Eastern
9415	Easton
9416	Easy Motion
9417	Easy Racers
9418	Ebgo
9419	Ebisu
9420	Eddy Merckx
9421	Edinburgh Bicycle Co-operative
9422	EighthInch
9423	Electra
9424	Electric Bike Technologies
9425	Elevn Technologies
9426	Elite SRL
9427	Elliptigo
9428	Ellis
9429	Ellis Briggs
9430	Ellsworth
9431	Emilio Bozzi
9432	Encore
9433	Enduro
9434	Endurox
9435	Energizer
9436	Engin Cycles
9437	Enigma Titanium
9438	Envo
9439	Epic
9440	Ergon
9441	Erickson Bikes
9442	Esbit
9443	Esge Kickstands
9444	Europa
9445	Evans Cycles
9446	Evelo
9447	Eveready
9448	Evil
9449	Evo
9450	Excess Components
9451	Exustar
9452	Ezee
9453	FBM
9454	FLX
9455	FRAMED
9456	FSA (Full Speed Ahead)
9457	Factor
9458	Faggin
9459	Failure
9460	Fairdale
9461	Fairlight
9462	Falco Bikes
9463	Falcon
9464	Fanatik
9465	Fantic
9466	Faraday
9467	Fast Wax
9468	Fat City Cycles
9469	Fatback
9470	FattE-Bikes
9471	Fausto Coppi
9472	Federal
9473	Felt
9474	Fetish
9475	Fezzari
9476	FiberFix
9477	Fiction
9478	Field
9479	Finish Line
9480	Finite
9481	Firefly Bicycles
9482	Firefox
9483	Firenze
9484	Firmstrong
9485	First Endurance
9486	Fit bike Co.
9487	Fizik
9488	Fleet Velo
9489	Fleetwing
9490	Flybikes
9491	Flying Pigeon
9492	Flying Scot
9493	Flyxii
9494	Focale44
9495	Focus
9496	Foggle
9497	Fokhan
9498	Folmer & Schwing
9499	Fondriest
9500	Forbidden Bikes
9501	Forge Bikes
9502	Formula
9503	Fortified
9504	Foundry Cycles
9505	Fox
9506	Fram
9507	Framebuilder Supply
9508	Frances
9509	Francesco Moser (F. Moser)
9510	Freddie Grubb
9511	Free Agent
9512	Free Spirit
9513	Freedom
9514	Freeload
9515	Frog bikes
9516	Fucare
9517	FuelBelt
9518	Fuji
9519	Fulcrum
9520	Fyxation
9521	G Sport
9522	G-Form
9523	GMC
9524	GOTRAX
9525	GU
9526	Gamut
9527	Gardin
9528	Garmin
9529	Garneau
9530	Gary Fisher
9531	Gates Carbon Drive
9532	Gateway
9533	Gavin
9534	Gazelle
9535	Gear Aid
9536	Gear Clamp
9537	Gear Up
9538	Geax
9539	GenZe
9540	Gendron Bicycles
9541	Genesis
9542	Genuine Innovations
9543	Geotech
9544	Gepida
9545	Gerard
9546	Ghost
9547	Gilmour
9548	Gineyea
9549	Giordano
9550	Gitane
9551	Glacier Glove
9552	Gladiator Cycle Company
9553	Globe
9554	Gnome et Rhône
9555	GoGirl
9556	Gocycle
9557	Golden Cycles
9558	Gomier
9559	Gordon Hill
9560	Gore
9561	Gorilla bikes
9562	Gormully & Jeffery
9563	Grab On
9564	Grabber
9565	Graber
9566	Graflex
9567	Granite Gear
9568	Gravity
9569	Green Light Cycle Ltd.
9570	Greenfield
9571	Greenspeed
9572	Growler Performance Bikes
9573	Guardian
9574	Gudereit
9575	Guerciotti
9576	Guerrilla Gravity
9577	Gunnar
9578	Guru
9579	H Plus Son
9580	HBBC (Huntington Beach Bicycle, Co)
9581	HED
9582	HERCULES
9583	HP Velotechnik
9584	Habanero
9585	Haibike
9586	Hallstrom
9587	Halo
9588	Haluzak
9589	Hammer Nutrition
9590	Hampsten Cycles
9591	Handsome Cycles
9592	Handspun
9593	Hanford
9594	Hardrocx
9595	Haro
9596	Harry Quinn
9597	Harvey Cycle Works
9598	Hasa
9599	Hase bikes
9600	Hayes
9601	Head
9602	Headsweats
9603	Heinkel
9604	Helkama
9605	Hercules Rodeado
9606	Heritage
9607	Herkelmann
9608	Hero Cycles Ltd
9609	Heron
9610	Hetchins
9611	Hexlox
9612	Heybike
9613	Hiboy
9614	High Gear
9615	Highland
9616	Hija de la Coneja
9617	Hilltopper
9618	Himiway
9619	Hinton Cycles
9620	Hiplok
9621	Hirschfeld
9622	Hirzl
9623	Hobson Bicycle Seats
9624	Hoffman
9625	Holdsworth
9626	Hollandia
9627	Honbike (Uni4)
9628	Honda
9629	Honey Stinger
9630	Hope
9631	Hornit
9632	House of Talents
9633	Hozan
9634	HubBub
9635	Hudz
9636	Huffy
9637	Hufnagel
9638	Humangear
9639	Humber
9640	Humble Frameworks
9641	Hunt Bike Wheels
9642	Hunter
9643	Hurricane Components
9644	Hurtu
9645	Hutchinson
9646	Hydrapak
9647	Hyper
9648	IBEX
9649	ICE Trikes (Inspired Cycle Engineering)
9650	ICan Cycling
9651	IRD (Interloc Racing Design)
9652	IRO Cycles
9653	ISM
9654	IZIP
9655	Ibera
9656	Ibis
9657	Ice Trekkers
9658	IceToolz
9659	Ideal Bikes
9660	Identiti
9661	Incredibell
9662	Independent Fabrication
9663	Industrieverband Fahrzeugbau
9664	Industry Nine
9665	Infini
9666	Infinity Cycle Works
9667	Inglis (Retrotec)
9668	Innerlight Cycles
9669	Innova
9670	Inspired
9671	Intekin
9672	Intense
9673	Iride Bicycles
9674	Ironhorse Bicycles (Iron Horse Bikes)
9675	Islabikes
9676	Issimo Designs
9677	Italvega
9678	Itera plastic bicycle
9679	Iver Johnson
9680	Iverson
9681	Izumi
9682	JMC Bicycles
9683	JP Weigle's
9684	Jagwire
9685	Jamis
9686	Jan Janssen
9687	Jandd
9688	GT
9689	Javelin
9690	Jetson
9691	Jettrike
9692	Joey
9693	John Cherry bicycles
9694	John Deere
9695	Johnny Loco
9696	Jorg & Olif
9697	Juiced Bikes
9698	Juliana Bicycles
9699	K-Edge
9700	K2
9701	KBC
9702	KHS Bicycles
9703	KMC
9704	KS
9705	KTM
9706	KW Bicycle
9707	Kakuka
9708	Kalkhoff
9709	Kalloy
9710	Katadyn
9711	Kazam
9712	Kelly
9713	Kenda
9714	Kent
9715	Kestrel
9716	Kettler Alu-Rad
9717	Kettler USA
9718	Kinesis
9719	Kinesis Industry
9720	Kinetic
9721	Kink
9722	Kinn
9723	Kirk
9724	Kish Fabrication
9725	Klein Bikes
9726	Knog
9727	Knolly
9728	Koga-Miyata
9729	Kogel
9730	Kogswell Cycles
9731	Kona
9732	Kool Kovers
9733	Kool-Stop
9734	Kreitler
9735	Kron
9736	Kronan
9737	Kross SA
9738	Kryptonite
9739	Kuat
9740	Kuota
9741	Kustom Kruiser
9742	Kuwahara
9743	LDG (Livery Design Gruppe)
9744	LOW//
9745	Land Shark
9746	Lankeleisi
9747	Lapierre
9748	Larry Vs Harry
9749	Lattis
9750	Lauf
9751	Laurin & Klement
9752	Lazer
9753	LeMond
9754	Leader Bikes
9755	Lectric Cycles
9756	Lectric eBikes
9757	Leg Lube
9758	Legacy Frameworks
9759	Lekker
9760	Leopard
9761	Lesoosebike
9762	Lezyne
9763	Liberty
9764	Light Bicycle
9765	Light My Fire
9766	Light and Motion
9767	Lightning Cycle Dynamics
9768	Lightspeed
9769	Linear
9770	Linka
9771	Linus
9772	Liotto (Cicli Liotto Gino & Figli)
9773	LiteLok
9774	Litespeed
9775	Liteville
9776	Liv
9777	Lizard Skins
9778	Loctite
9779	Loekie
9780	Lonely Planet
9781	Longbikes
9782	Look
9783	Lotus
9784	Louis Garneau
9785	Louison Bobet
9786	Lynskey
9787	M-Wave
9788	M2S Bikes
9789	MBK
9790	MEC (Mountain Equipment Co-op)
9791	MKS
9792	MMR
9793	MRP
9794	MSR
9795	MVMT Bikes
9796	Macfox
9797	Madsen
9798	Madwagon
9799	Magellan
9800	Magna
9801	Magnum Bikes
9802	Magura
9803	Malvern Star
9804	ManKind
9805	Mango
9806	Manhattan
9807	Manitou
9808	Mantis
9809	Map Bicycles
9810	Maraton
9811	Marin Bikes
9812	Marinoni
9813	Mars Cycles
9814	Marson
9815	Maruishi
9816	Marukin
9817	Marzocchi
9818	Masi
9819	Mason Cycles
9820	Master Lock
9821	Matra
9822	Maverick
9823	Mavic
9824	Maxcom
9825	Maxit
9826	Maxxis
9827	Maxyara
9828	Meiser
9829	Melon Bicycles
9830	Mercian Cycles
9831	Mercier
9832	Merit Bikes
9833	Merlin
9834	MetaBikes
9835	Metrofiets
9836	Micajah C. Henley
9837	Micargi
9838	Miche
9839	Michelin
9840	MicroShift
9841	Miele bicycles
9842	Mikkelsen
9843	Milwaukee Bicycle Co.
9844	Minoura
9845	MirraCo
9846	Mirrycle
9847	Mission Bicycles
9848	Miyata
9849	Mizutani
9850	Modolo
9851	Moma (momabikes)
9852	Momentum
9853	Monark
9854	Mondia
9855	Mondraker
9856	Mongoose
9857	Montague
9858	Montra
9859	Moon Cool
9860	Moots Cycles
9861	Mosaic
9862	Moser Cicli
9863	Mosh
9864	Mosso
9865	Kellys
9866	Moth Attack
9867	Motiv
9868	Motobecane
9869	Motrike
9870	Moulden
9871	Moulton Bicycle
9872	Mountain Cycles
9873	Mountainsmith
9874	Moustache bikes
9875	Movin'
9876	Mr. Tuffy
9877	Mucky Nutz
9878	Muddy Fox
9879	Murray
9880	Mutant Bikes
9881	Mutiny
9882	Müsing (Muesing)
9883	NCM eBikes
9884	NEMO
9885	NS Bikes
9886	Nakamura
9887	Naked
9888	Nakto
9889	Nantucket Bike Basket Company
9890	Nashbar
9891	Nathan
9892	National
9893	Native
9894	Nazca
9895	Neil Pryde
9896	Nema
9897	Neobike
9898	New Albion
9899	New Balance
9900	Next
9901	Niner
9902	Nirve
9903	Nishiki
9904	Nite Ize
9905	NiteRider
9906	Nitto
9907	Niu (Jiangsu Niu Electric Technology Co., Ltd.)
9908	Nokian
9909	Nokon
9910	Nomad Cargo
9911	Norco Bikes
9912	Norcross
9913	Nordlicht
9914	Normal Bicycles
9915	Norman Cycles
9916	North Shore Billet
9917	Northrock
9918	Novara
9919	NuVinci
9920	Nukeproof
9921	Nymanbolagen
9922	O'Leary
9923	O-Stand
9924	ODI
9925	OHM
9926	OPEN
9927	Obed
9928	Odyssey
9929	Old Man Mountain
9930	Olmo
9931	Omnium
9932	On-One
9933	OnGuard
9934	One Up
9935	One Way
9936	OneWheel
9937	Onway
9938	Opel
9939	Optic Nerve
9940	Optimus
9941	Opus
9942	Orange Bikes
9943	Orbea
9944	Orbit
9945	Orfos
9946	Orient Bikes
9947	Origin8
9948	Ortlieb
9949	Other
9950	Otis Guy
9951	Otso
9952	Ottolock
9953	Oury
9954	OutGo
9955	Oval Concepts
9956	Owl 360
9957	Oyama
9958	Oyma Power
9959	Ozone
9960	P Tec
9961	PDW
9962	PNW
9963	PUBLIC bikes
9964	Pace Sportswear
9965	Pacific Cycle
9966	Pake
9967	Panaracer
9968	Panasonic
9969	Paper Bicycle
9970	Park Tool
9971	Parkpre
9972	Parlee
9973	Pasculli
9974	Pashley Cycles
9975	Patria
9976	Paul
9977	Pearl Izumi
9978	Pedal Electric
9979	Pedego (Pedego Electric Bikes)
9980	Pedersen bicycle
9981	Pedro's
9982	Pegasus
9983	Pegoretti
9984	Penguin Brands
9985	Penhale Bicycle Co.
9986	Pereira
9987	Performance
9988	Performer
9989	Peugeot
9990	Phat Cycles
9991	Phil Wood
9992	Phillips Cycles
9993	Phoenix
9994	Pilen
9995	Pinarello
9996	Pinhead
9997	Pinnacle
9998	Pipedream Cycles
9999	Pitlock
10000	Pivot
10001	Planet Bike
10002	Planet X
10003	Pletscher
10004	Po Campo
10005	Pogliaghi
10006	Polar
10007	Polygon
10008	Pope Manufacturing Company
10009	Portland Design Works
10010	Power Grips
10011	PowerTap
10012	Praxis
10013	Premium
10014	Prevelo
10015	Price
10016	Primo
10017	Primus Mootry
10018	Princeton Tec
10019	Principia
10020	Priority Bicycles
10021	Private Label
10022	Pro-tec
10023	ProGold
10024	Problem Solvers
10025	Procycle Group
10026	Prodeco Tech
10027	Profile Design
10028	Profile Racing
10029	Prologo
10030	Promax
10031	Propain
10032	Prophete
10033	Puch
10034	Pure Cycles (Pure Fix Cycles)
10035	Python
10036	Python Pro
10037	QBP
10038	QWIC
10039	Quadrant Cycle Company
10040	Quest
10041	Quintana Roo
10042	REI Co-op (Co-op Cycles)
10043	RIH
10044	RIH Sport Amsterdam
10045	RSD
10047	Rabeneick
10048	RaceFace
10049	Racktime
10050	Rad Power Bikes
10051	Radio (Radio Bike Co)
10052	Radio Flyer
10053	Ragley
10054	Raleigh
10055	Ram
10056	Rambler
10057	Rans Designs
10058	Rapide
10059	Rat Rod Bikes
10060	Ratking
10061	RavX
10062	Rawland Cycles
10063	Razor
10064	Redline
10065	Redlof
10066	Redshift
10067	Reid
10068	Renthal
10069	René Herse
10070	Republic
10071	Reserve
10072	Resist
10073	Retrospec
10074	Revel
10075	Revelate Designs
10076	Revi
10077	Ribble
10078	Ride1Up
10079	Ridgeback
10080	Ridley
10081	Riese & Müller (Riese and Muller)
10082	Rift
10083	Ritchey
10084	Ritte
10085	Rivendell Bicycle Works
10086	Roadmaster
10087	Roberts Cycles
10088	Robin Hood
10089	Robinson
10090	Rock Lobster
10091	RockShox
10092	Rocky Mountain
10093	Rocky Mounts
10094	Rodeo Adventure Labs
10095	Rodriguez
10096	Rogue Panda
10097	Rohloff
10098	Rokform
10099	Rola
10100	Roll Bicycle Company
10101	Rosko
10102	Ross
10103	Rossignol
10104	Rossin
10105	Rotor
10106	Rover Company
10107	Rowbike
10108	Royal
10109	Royce Union
10110	Rudge-Whitworth
10111	Ryde
10112	S & M (S and M Bikes)
10113	SC Bicycles
10114	SCOR
10115	SCOTT
10116	SDG
10117	SE Bikes
10118	SKS
10119	SLS3
10120	SON Nabendynamo (Wilfried Schmidt Maschinenbau)
10121	SQlab
10122	SR Suntour
10123	SRAM
10124	START
10125	STRiDA
10126	SUNringlé
10127	Sage Titanium Bicycles
10128	Sakae
10129	Salsa
10130	Salt BMX
10131	Samchuly
10132	Sancineto
10133	Sanderson
10134	Santa Cruz
10135	Santana Cycles
10136	Saracen Cycles
10137	Saris
10138	Satori
10139	Sava
10140	Scania AB
10141	Scapin
10142	Scattante
10143	Schindelhauer
10144	Schlage
10145	Schwalbe
10146	Schwinn
10147	Seal Line
10148	Sears Roebuck
10149	Season
10150	Seattle Sports Company
10151	SeatyLock
10152	Segway Ninebot (Ninebot)
10153	Sekai
10154	Sekine
10155	Selle Anatomica
10156	Selle Italia
10157	Selle Royal
10158	Selle San Marco
10159	Sense
10160	Serfas
10161	Serotta
10162	Sette
10163	Seven Cycles
10164	Shadow Conspiracy
10165	Shelby Cycle Company
10166	Sherpani
10167	Shimano
10168	Shinola
10169	Shogun
10170	Shredder
10171	Sidi
10172	Sigma
10173	Sigtuna
10174	Silca
10175	Silverback
10176	SimWorks
10177	Simcoe
10178	Simplon
10179	Simson
10180	Sinclair Zike
10181	Sinz
10182	Six-Eleven
10183	SixSixOne
10184	Skinz
10185	Skyway
10186	Slime
10187	Sohrab Cycles
10188	Solex
10189	Solé (Sole bicycles)
10190	Soma
10191	Somec
10192	Sondors
10193	Sonoma
10194	Soulcraft
10195	Source
10196	Spalding Bicycles
10197	Sparta
10198	Specialized
10199	Spectrum
10200	Speedco
10201	Speedfil
10202	Speedplay
10203	Speedvagen
10204	Speedwell bicycles
10205	Spicer
10206	SpiderTech
10207	Spooky
10208	Sportneer
10209	Spot
10210	Sprintech
10211	Spurcycle
10212	Squire
10213	St. Tropez
10214	Stages
10215	Staiger
10216	Stan's No Tubes
10217	Standard Byke
10218	Standert
10219	Stanley
10220	Stanridge
10221	State Bicycle Co.
10222	Steadyrack
10223	Stealth Electric Bikes
10224	Steelman Cycles
10225	Stein
10226	Stein Trikes
10227	Stelber Cycle Corp
10228	Stella
10229	Stem Captain
10230	Sterling Bicycle Co.
10231	Steve Potts
10232	Stevens
10233	Stevenson Custom Bicycles
10234	Stinner
10235	Stoemper
10236	Stolen Bicycle Co.
10237	Stoneridge Cycle
10238	Stooge Cycles
10239	Strada Customs
10240	Stradalli Cycles
10241	Straitline
10242	Strawberry Bicycle
10243	Strider (Strider sports)
10244	Stromer
10245	Strong Frames
10246	Sturmey-Archer
10247	Stålhästen
10248	Subrosa
10249	Suelo
10250	Sugino
10251	Sun
10252	SunRace
10253	Sunday
10254	Sunn
10255	Super73
10256	Supercross
10257	Supercycle
10258	Supernova Bikes
10259	Supernova Lights
10260	Superpedestrian
10261	Surface604
10262	Surly
10263	Surrey
10264	Suunto
10265	Swagman
10266	Sweetpea Bicycles
10267	Swingset
10268	Swobo
10269	SyCip
10270	Syncros
10271	Syntace
10272	T-Lab
10273	TET Cycles (Tom Teesdale Bikes)
10274	TH Industries
10275	TI Cycles
10276	TI Cycles of India
10277	TRP
10278	Taarnby
10279	Tacx
10280	Tadpole
10281	Takara
10282	Talisman Bikes
10283	Tamer
10284	Tange-Seiki
10285	Tangent Products
10286	Taotao
10287	Tati Cycles
10288	Taylor Bicycles (Paul Taylor)
10289	Tec Labs
10290	Tektro
10291	Tern
10292	Terra Trike
10293	Terrible One
10294	Terrot
10295	Terry
10296	Tex-Lock
10297	The Hive
10298	Thesis Bike
10299	Thomson
10300	Thorn Cycles
10301	Thrill
10302	Throne Cycles
10303	Thruster
10304	Thule
10305	TiGr
10306	TigoMac
10307	Timbuk2
10308	Time
10309	Tioga
10310	Titan
10311	Titus
10312	Token
10313	Tokyobike
10314	Tomac
10315	Tommasini
10316	Tommaso
10317	Tony Hawk
10318	Topeak
10319	TorHans
10320	Torelli
10321	Torker
10322	Total BMX
10323	Tour de France
10324	Tout Terrain
10325	Toyo
10326	Track and Trail
10327	Traitor
10328	Transit
10329	Transition Bikes
10330	TranzX
10331	Trayl
10332	Tree
10333	Trek
10334	Tribe Bicycle Co
10335	Trident
10336	Trik Topz
10337	TrikExplor
10338	Trinx
10339	Triumph Cycle
10340	TruVativ
10341	Tubasti
10342	Tubus
10343	Tufo
10344	Tunturi
10345	Turboant
10346	Turin
10347	Turner Bicycles
10348	Twin Six
10349	TwoFish
10350	Ubco Adventure
10351	Umberto Dei
10352	Unior
10353	Univega
10354	Unknown
10355	Upland
10356	Upstand
10357	Urago
10358	Urban Arrow
10359	Urban Bike
10360	VAAST
10361	VP Components
10362	VSF Fahrradmanufaktur
10363	Valdora
10364	Vamoose cycles
10365	Van Dessel
10366	Van Herwerden
10367	Van Raam
10368	VanMoof
10369	Vassago
10370	Vee Rubber
10371	Vela Bikes
10372	Velec
10373	Velo
10374	Velo De Ville
10375	Velo Orange
10376	Velo Vie
10377	Veloce
10378	Velocity
10379	Velomont
10380	Velomotors
10381	Velorbis
10382	Veloretti
10383	Velotric
10384	Velox
10385	Ventum
10386	Verde
10387	Versa
10388	Via Velo
10389	Vicini
10390	Vilano
10391	Villy Customs
10392	Vincero Design
10393	Vindec High Riser
10394	Viner
10395	Virtue
10396	Viscount
10397	Vision
10398	Vista
10399	Vittoria Shoes and Helmets
10400	Vittoria Tires
10401	Vitus
10402	Viva
10403	Vivente
10404	Volae
10405	Volagi
10406	Volt Bike (VoltBike)
10407	Volume
10408	Vonax
10409	Voodoo
10410	Vortrieb
10411	Vtuvia
10412	Vuelta
10413	Vvolt
10414	Vélo Bolton
10415	VéloSoleX
10416	WTB (Wilderness Trail Bikes)
10417	Wabi Cycles
10418	Wahoo
10419	Wald
10420	Walking Bird
10421	Waterford
10422	Wdnsdy
10423	WeThePeople
10424	WeeRide
10425	Weehoo
10426	Weinmann
10427	Wellgo
10428	Wheels Manufacturing
10429	Wheelsmith
10430	Whirlwind
10431	Whisky Parts Co
10432	Whispbar
10433	White Bros
10434	White Industries
10435	White Lightning
10436	Wilier (Wilier Triestina)
10437	Willworx
10438	Windsor
10439	Winora
10440	Winter Bicycles
10441	Witcomb Cycles
10442	Wittson
10443	Wolf Tooth Components
10444	Woodman Components
10445	Woom
10446	WordLock
10447	WorkCycles
10448	Worksman Cycles
10449	Wraith Fabrication
10450	Wright Cycle Company
10451	X-Fusion
10452	X-Lab
10453	X-Treme
10454	Xds
10455	Xiaomi
10456	Xootr
10457	Xpedo
10458	Xtracycle
10459	YST
10460	YT
10461	Yakima
10462	Yaktrax
10463	Yamaguchi Bicycles
10464	Yamaha
10465	Yess (Yess BMX)
10466	Yeti
10467	Yuba
10468	Zigo
10469	Zinn Cycles
10470	Zipp
10471	Zizzo (ZiZZO Folding Bikes)
10472	Zoom Balance Bike
10473	Zycle Fix
10474	b'Twin (Btwin)
10475	beixo
10476	da Vinci Designs (daVinci Tandems)
10477	de Fietsfabriek
10478	di Florino
10479	e*thirteen
10480	eFlow
10481	eVox
10482	eZip
10483	iGo Electric Bikes
10484	k.bedford customs
10485	samebike
10486	sixthreezero
10487	Giant
10488	Merida
10489	Rock Machine
10490	CTM
\.


--
-- Data for Name: bike_event_attachments; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_event_attachments (id, bike_event_id, name, url, content_type, created_at) FROM stdin;
1	13	faktura.pdf	https://cdn.example.com/files/faktura.pdf	application/pdf	2026-04-28 13:28:39.393+00
\.


--
-- Data for Name: bike_models; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_models (id, model_name, brand_id) FROM stdin;
1961	Tarmac	10198
1962	Roubaix	10198
1963	Allez	10198
1964	Aethos	10198
1965	Epic	10198
1966	Stumpjumper	10198
1967	Enduro	10198
1968	Chisel	10198
1969	Diverge	10198
1970	Crux	10198
1971	Turbo Levo	10198
1972	Vado	10198
1973	Madone	10333
1974	Émonda	10333
1975	Domane	10333
1976	Fuel EX	10333
1977	Slash	10333
1978	Top Fuel	10333
1979	Marlin	10333
1980	X-Caliber	10333
1981	Roscoe	10333
1982	Checkpoint	10333
1983	Rail	10333
1984	TCR	10487
1985	Defy	10487
1986	Propel	10487
1987	Trance	10487
1988	Anthem	10487
1989	Reign	10487
1990	Talon	10487
1991	XTC	10487
1992	Revolt	10487
1993	TCX	10487
1994	Stance	10487
1995	Fathom	10487
1996	SuperSix EVO	9235
1997	Synapse	9235
1998	CAAD13	9235
1999	Scalpel	9235
2000	Habit	9235
2001	Jekyll	9235
2002	Trail	9235
2003	F-Si	9235
2004	Topstone	9235
2005	Moterra	9235
2006	Addict	8994
2007	Foil	8994
2008	Speedster	8994
2009	Spark	8994
2010	Genius	8994
2011	Ransom	8994
2012	Scale	8994
2013	Aspect	8994
2014	Patron	8994
2015	Strike	8994
2016	Ultimate	8993
2017	Aeroad	8993
2018	Endurace	8993
2019	Spectral	8993
2020	Neuron	8993
2021	Strive	8993
2022	Exceed	8993
2023	Grand Canyon	8993
2024	Grail	8993
2025	Grizl	8993
2026	Litening	9311
2027	Agree	9311
2028	Attain	9311
2029	Stereo	9311
2030	Reaction	9311
2031	Aim	9311
2032	Analog	9311
2033	Nuroad	9311
2034	Kathmandu	9311
2035	Stereo Hybrid	9311
2036	Nomad	10134
2037	Bronson	10134
2038	Hightower	10134
2039	Megatower	10134
2040	Tallboy	10134
2041	Blur	10134
2042	Chameleon	10134
2043	Stigmata	10134
2044	Heckler	10134
2045	Orca	9943
2046	Oiz	9943
2047	Occam	9943
2048	Rallon	9943
2049	Alma	9943
2050	Laufey	9943
2051	Terra	9943
2052	Rise	9943
2053	Wild	9943
2054	Scultura	10488
2055	Reacto	10488
2056	One-Sixty	10488
2057	One-Twenty	10488
2058	Big.Nine	10488
2059	Silex	10488
2060	eOne-Sixty	10488
2061	Oltre	9133
2062	Specialissima	9133
2063	Aria	9133
2064	Infinito	9133
2065	Sprint	9133
2066	Methanol	9133
2067	Impulso	9133
2068	Arcadex	9133
2069	Dogma F	9995
2070	Prince	9995
2071	Paris	9995
2072	Grevil	9995
2073	Crossista	9995
2074	Nytro	9995
2075	R5	9247
2076	S5	9247
2077	Caledonia	9247
2078	Áspero	9247
2079	ZHT-5	9247
2080	P5	9247
2081	Revelator	9705
2082	Scarp	9705
2083	Myroon	9705
2084	Kapoho	9705
2085	Prowler	9705
2086	Macina	9705
2087	Lector	9546
2088	Riot	9546
2089	Kato	9546
2090	Nirvana	9546
2091	Asket	9546
2092	E-Riot	9546
2093	Zaskar	9688
2094	Sensor	9688
2095	Force	9688
2096	Fury	9688
2097	Avalanche	9688
2098	Grade	9688
2099	SB115	10466
2100	SB120	10466
2101	SB130	10466
2102	SB140	10466
2103	SB150	10466
2104	SB160	10466
2105	ARC	10466
2106	Mach 4	10000
2107	Trail 429	10000
2108	Switchblade	10000
2109	Firebird	10000
2110	Vault	10000
2111	Izalco Max	9495
2112	Jam	9495
2113	Thron	9495
2114	O1E	9495
2115	Raven	9495
2116	Atlas	9495
2117	Jam²	9495
2118	Xelius	9747
2119	Aircode	9747
2120	Pulsium	9747
2121	Zesty	9747
2122	Spicy	9747
2123	XR	9747
2124	Prorace	9747
2125	XF	8995
2126	XP	8995
2127	X-Road	8995
2128	Modo	8995
2129	eXF	8995
2130	eXP	8995
2131	Blizzard	10489
2132	Blizz	10489
2133	Torrent	10489
2134	Catherine	10489
2135	Gravelride	10489
2136	Vylet	10489
2137	Charisma	9073
2138	Aura	9073
2139	Magnum	9073
2140	Instinct	9073
2141	Sector	9073
2142	Ronin	9073
2143	stratOS	9073
2144	URC	9865
2145	Swag	9865
2146	Hacker	9865
2147	Gate	9865
2148	Spider	9865
2149	Soot	9865
2150	Theos	9865
2151	Ridge	10490
2152	Scroll	10490
2153	Rascal	10490
2154	Zephyr	10490
2155	Skaut	10490
2156	Koyuk	10490
\.


--
-- Data for Name: bike_sizes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_sizes (id, size) FROM stdin;
54	XS
55	S
56	M
57	L
58	XL
\.


--
-- Data for Name: bike_types; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_types (id, type) FROM stdin;
49	Road
50	Enduro
51	Trail
52	DH
53	XC
54	Fat Bike
55	Gravel
56	Dirt
60	Freeride
61	test
\.


--
-- Data for Name: bikes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bikes (id, bike_type_id, year, wheel_size_id, bike_size_id, created_at, updated_at, frame_material, is_deleted, deleted_at, bikename, description, bike_brand, bike_model, user_id, organization_id, image_url, ride_style_id, ebike, has_front_suspension, has_rear_suspension, total_km, total_time_min) FROM stdin;
95	50	2023	15	57	2026-03-24 09:59:18.925+00	\N	Carbon	f	\N	My awesome bike	This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.	Specialized	Stumpjumper	38	\N	\N	\N	f	f	f	\N	\N
96	50	2023	15	57	2026-03-24 09:59:35.264+00	\N	Carbon	f	\N	My awesome bike	This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.	Specialized	Stumpjumper	38	\N	\N	\N	f	f	f	\N	\N
97	50	2023	15	57	2026-03-24 10:02:30.576+00	\N	Carbon	f	\N	My awesome bike	This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.	Specialized	Stumpjumper	38	\N	\N	\N	f	f	f	\N	\N
98	50	2023	15	57	2026-03-24 10:23:00.64+00	\N	Carbon	f	\N	My awesome bike	This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.	Specialized	Stumpjumper	38	\N	\N	\N	f	f	f	\N	\N
99	50	2023	15	57	2026-03-24 10:23:11.733+00	\N	Carbon	f	\N	My awesome bike	This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.	Specialized	Stumpjumper	38	\N	\N	\N	f	f	f	\N	\N
100	50	2023	15	57	2026-03-24 10:23:26.761+00	\N	Carbon	f	\N	My awesome bike	This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.	Specialized	Stumpjumper	38	\N	\N	\N	f	f	f	\N	\N
101	\N	\N	\N	\N	2026-03-25 14:46:49.698+00	\N	\N	f	\N	\N	\N	hovno	\N	38	\N	\N	\N	f	f	f	\N	\N
106	50	\N	\N	\N	2026-03-25 14:50:44.108+00	\N	Carbon	f	\N	\N	\N	Trek shit	Domane SL 7ss	38	\N	https://example.com/bike-image.jpg	\N	f	f	f	\N	\N
131	50	2024	15	56	2026-04-01 11:29:30.653+00	\N	Carbon	f	\N	Tarmac SL7	Serviced bike, top health	Trek	Domane SL7	38	\N	/images/bikes/350a8009-c403-470c-b6d5-f92cd4bf9ee8.jpg	\N	f	f	f	\N	\N
132	50	2024	15	56	2026-04-01 11:29:37.517+00	\N	Carbon	f	\N	Tarmac SL7	Serviced bike, top health	Trek	Domane SL7	38	\N	/images/bikes/60f91006-820b-421b-a749-163724a55efd.jpg	\N	f	f	f	\N	\N
133	50	2024	15	56	2026-04-03 10:31:06.725+00	\N	Carbon	f	\N	Tarmac SL7	Serviced bike, top health	Trek	Domane SL7	38	\N	https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev/bikes/cdd9594e-9434-4fad-b5e8-4e15aebb966e.webp	\N	f	f	f	\N	\N
134	50	2024	15	56	2026-04-03 10:33:17.997+00	\N	Carbon	f	\N	Tarmac SL7	Serviced bike, top health	Trek	Domane SL7	38	\N	https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev/bikes/31d42dcb-1e0f-4481-b971-4ad18900b734.webp	\N	f	f	f	\N	\N
140	50	2024	13	58	2026-04-10 08:07:20.557+00	\N	Carbon	f	\N	Tarmac SL7	Serviced bike, top health	Trek	Domane SL7	40	2	https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev/bikes/ccc79d23-c14c-4714-b877-d75f4a282c53.webp	\N	t	f	f	\N	\N
141	50	2024	13	58	2026-04-10 09:56:22.425+00	\N	Carbon	f	\N	Tarmac SL7	Serviced bike, top health	Trek	Domane SL7	40	2	https://pub-4ee94249a97347858cdaf97e203e0980.r2.dev/bikes/2b0ac4a5-9747-400d-8f65-56da621b5303.webp	\N	t	f	f	\N	\N
\.


--
-- Data for Name: component_groups; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.component_groups (id, group_name, side_choice) FROM stdin;
7	Suspension	f
8	Frame	f
9	Cockpit	f
10	Saddle & Seatpost	f
14	E-bike	f
15	Other	f
11	Wheels	t
12	Drivetrain	f
13	Brakes	t
\.


--
-- Data for Name: component_types; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.component_types (id, component_type, ebike, component_group_id, has_position, user_id) FROM stdin;
309	Pedals	f	15	f	\N
302	Shifter	f	12	t	\N
342	Brake pad	f	13	t	\N
282	Fork	f	7	f	\N
283	Shock	f	7	f	\N
281	Frame	f	8	f	\N
343	Inserts	f	11	t	\N
344	Valves	f	11	f	\N
286	Handlebar	f	9	f	\N
285	Stem	f	9	f	\N
304	Grips	f	9	f	\N
330	Axle	f	11	t	\N
287	Saddle	f	10	f	\N
288	Seatpost	f	10	f	\N
345	Dropper Lever	f	9	f	\N
346	Brakes	f	13	f	\N
347	Chainring	f	12	f	\N
348	Bashguard	f	12	f	\N
292	Crank	f	12	f	\N
350	Sealant	f	11	t	\N
294	Cassette	f	12	f	\N
295	Chain	f	12	f	\N
296	Chain Guide	f	12	f	\N
328	Bottom Bracket	f	12	f	\N
349	Hanger	f	8	f	\N
351	E-Bike System	t	14	f	\N
352	Remote Lever	f	9	f	\N
305	Motor	t	14	f	\N
306	Battery	t	14	f	\N
307	Display	t	14	f	\N
308	Charger	f	14	f	\N
284	Headset	f	9	f	\N
289	Rim	f	11	t	\N
290	Tire	f	11	t	\N
291	Derailleur	f	12	t	\N
297	Brake Caliper	f	13	t	\N
298	Hub	f	11	t	\N
300	Brake Rotor	f	13	t	\N
303	Brake Lever	f	13	t	\N
\.


--
-- Data for Name: components_mounted; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.components_mounted (id, bike_id, component_type_id, mounted_at, removed_at, updated_at, created_at, note, is_active, is_deleted, deleted_at, component_desc, "position", total_km, total_time_min, health_index) FROM stdin;
73	95	281	2026-03-24 10:23:00.659+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Carbon	\N	\N	0	\N
74	95	282	2026-03-24 10:23:00.702+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Carbon	\N	\N	0	\N
75	95	305	2026-03-24 10:23:00.705+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Bosch 600W 75Nm mid-drive	\N	\N	0	\N
76	95	306	2026-03-24 10:23:00.706+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Bosch 500Wh	\N	\N	0	\N
77	95	297	2026-03-24 10:23:00.71+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Shimano GRX 400 Hydraulic Disc	\N	\N	0	\N
78	95	285	2026-03-24 10:23:00.725+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Size: 52, 54, Bontrager Elite, 31.8mm, Blendr compatible, 7 degree, 90mm length; Size: 56, 58, Bontrager Elite, 31.8mm, Blendr compatible, 7 degree, 100mm length; Size: 58, 60, Bontrager Elite, 31.8mm, Blendr compatible, 7 degree, 110mm length	\N	\N	0	\N
79	95	286	2026-03-24 10:23:00.73+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Size: 52, Bontrager Elite IsoZone VR-CF, alloy, 31.8mm, internal Di2 routing, 93mm reach, 123mm drop, 40cm width; Size: 54, 56, Bontrager Elite IsoZone VR-CF, alloy, 31.8mm, internal Di2 routing, 93mm reach, 123mm drop, 42cm width; Size: 58, 60, Bontrager Elite IsoZone VR-CF, alloy, 31.8mm, internal Di2 routing, 93mm reach, 123mm drop, 44cm width	\N	\N	0	\N
80	95	287	2026-03-24 10:23:00.73+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Bontrager Aeolus Elite, austenite rails, 145mm width	\N	\N	0	\N
81	95	288	2026-03-24 10:23:00.736+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Size: 52, 54, 56, Bontrager carbon internal seatmast cap, integrated light mount, 20mm offset, short length; Size: 58, Bontrager carbon internal seatmast cap, integrated light mount, 20mm offset, tall length	\N	\N	0	\N
82	95	291	2026-03-24 10:23:00.733+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Shimano GRX RX812, long cage, 42T max cog	\N	\N	0	\N
83	95	292	2026-03-24 10:23:00.662+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Size: 52, Praxis Alloy for Bosch, 46T, 170mm length; Size: 54, 56, Praxis Alloy for Bosch, 46T, 172.5mm length; Size: 58, 60, Praxis Alloy for Bosch, 46T, 175mm length	\N	\N	0	\N
84	95	302	2026-03-24 10:23:00.663+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Shimano GRX RX810, 11 speed	\N	\N	0	\N
159	134	281	2026-03-26 09:00:00+00	\N	2026-04-03 10:33:18.014+00	2026-04-03 10:33:18.014+00	Mounted after spring service	t	f	\N	Carbon	\N	\N	0	\N
86	95	295	2026-03-24 10:23:00.664+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Shimano Ultegra HG701, 11-speed	\N	\N	0	\N
87	95	289	2026-03-24 10:23:00.664+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Front: Bontrager Paradigm Comp 25, Tubeless Ready, 25mm rim width, 100x12mm thru axle, Rear: Bontrager Paradigm Comp 25, Tubeless Ready, 25mm rim width, Shimano 11-speed freehub, 142x12 thru axle	\N	\N	0	\N
88	95	290	2026-03-24 10:23:00.665+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Schwalbe G-One Speed, 700x35	\N	\N	0	\N
89	95	300	2026-03-24 10:23:00.665+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Size: 52, 54, 56, 58, 60, Shimano RT800, 160mm, centerlock; Size: 52, 54, 56, 58, 60, Shimano MT900, 160mm, centerlock; Size: 52, 54, 56, 58, 60, Shimano EM810, 160mm, centerlock	\N	\N	0	\N
90	95	308	2026-03-24 10:23:00.665+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Bosch standard 4A (100-240V) charger	\N	\N	0	\N
160	134	282	\N	\N	2026-04-03 10:33:18.014+00	2026-04-03 10:33:18.014+00	Mounted after spring service	t	f	\N	Fox 38 Factory Grip2	\N	\N	0	\N
161	134	283	\N	\N	2026-04-03 10:33:18.014+00	2026-04-03 10:33:18.014+00	\N	t	f	\N	Fox shock	\N	\N	0	\N
171	141	309	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	\N	\N	\N	0	\N
172	141	302	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	\N	front	\N	0	\N
173	141	302	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	\N	rear	\N	0	\N
176	141	282	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	\N	\N	\N	0	\N
177	141	283	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	\N	\N	\N	0	\N
178	141	281	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	\N	\N	\N	0	\N
175	141	342	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	Galfer	rear	\N	0	\N
174	141	342	\N	\N	2026-04-10 09:56:22.444+00	2026-04-10 09:56:22.444+00	\N	t	f	\N	Galfer	front	\N	0	\N
180	141	297	\N	\N	2026-04-23 15:05:00.427559+00	2026-04-23 15:05:00.427559+00	\N	t	f	\N	Deore caliper	front	\N	0	\N
182	95	295	\N	\N	2026-04-28 05:19:37.695+00	2026-04-28 05:19:37.695+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
184	95	295	\N	\N	2026-04-28 05:41:05.639+00	2026-04-28 05:41:05.639+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
187	95	295	\N	\N	2026-04-28 05:46:15.17+00	2026-04-28 05:46:15.17+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
189	95	295	\N	\N	2026-04-28 05:48:21.177+00	2026-04-28 05:48:21.177+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
162	134	295	2026-03-26 09:00:00+00	\N	2026-04-03 10:33:18.014+00	2026-04-03 10:33:18.014+00	\N	f	f	\N	Shimano chain	\N	\N	0	\N
191	95	295	\N	\N	2026-04-28 13:28:39.407+00	2026-04-28 13:28:39.407+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
147	131	281	2026-03-26 09:00:00+00	\N	2026-04-01 11:29:30.669+00	2026-04-01 11:29:30.669+00	Mounted after spring service	t	f	\N	Carbon	\N	\N	0	\N
148	131	282	\N	\N	2026-04-01 11:29:30.669+00	2026-04-01 11:29:30.669+00	Mounted after spring service	t	f	\N	Fox 38 Factory Grip2	\N	\N	0	\N
149	131	283	\N	\N	2026-04-01 11:29:30.669+00	2026-04-01 11:29:30.669+00	\N	t	f	\N	Fox shock	\N	\N	0	\N
150	131	295	2026-03-26 09:00:00+00	\N	2026-04-01 11:29:30.669+00	2026-04-01 11:29:30.669+00	\N	t	f	\N	Shimano chain	\N	\N	0	\N
85	95	294	2026-03-24 10:23:00.664+00	\N	2026-03-24 10:23:00.743+00	2026-03-24 10:23:00.743+00	\N	t	f	\N	Updated description	\N	\N	0	\N
151	132	281	2026-03-26 09:00:00+00	\N	2026-04-01 11:29:37.521+00	2026-04-01 11:29:37.521+00	Mounted after spring service	t	f	\N	Carbon	\N	\N	0	\N
152	132	282	\N	\N	2026-04-01 11:29:37.521+00	2026-04-01 11:29:37.521+00	Mounted after spring service	t	f	\N	Fox 38 Factory Grip2	\N	\N	0	\N
153	132	283	\N	\N	2026-04-01 11:29:37.521+00	2026-04-01 11:29:37.521+00	\N	t	f	\N	Fox shock	\N	\N	0	\N
154	132	295	2026-03-26 09:00:00+00	\N	2026-04-01 11:29:37.521+00	2026-04-01 11:29:37.521+00	\N	t	f	\N	Shimano chain	\N	\N	0	\N
155	133	281	2026-03-26 09:00:00+00	\N	2026-04-03 10:31:06.742+00	2026-04-03 10:31:06.742+00	Mounted after spring service	t	f	\N	Carbon	\N	\N	0	\N
156	133	282	\N	\N	2026-04-03 10:31:06.742+00	2026-04-03 10:31:06.742+00	Mounted after spring service	t	f	\N	Fox 38 Factory Grip2	\N	\N	0	\N
157	133	283	\N	\N	2026-04-03 10:31:06.742+00	2026-04-03 10:31:06.742+00	\N	t	f	\N	Fox shock	\N	\N	0	\N
158	133	295	2026-03-26 09:00:00+00	\N	2026-04-03 10:31:06.742+00	2026-04-03 10:31:06.742+00	\N	t	f	\N	Shimano chain	\N	\N	0	\N
163	140	309	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	\N	\N	0	\N
164	140	302	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	front	\N	0	\N
165	140	302	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	rear	\N	0	\N
166	140	342	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	front	\N	0	\N
167	140	342	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	rear	\N	0	\N
168	140	282	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	\N	\N	0	\N
169	140	283	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	\N	\N	0	\N
170	140	281	\N	\N	2026-04-10 08:07:20.58+00	2026-04-10 08:07:20.58+00	\N	t	f	\N	\N	\N	\N	0	\N
179	141	297	\N	\N	2026-04-23 15:04:14.810493+00	2026-04-23 15:04:14.810493+00	\N	t	f	\N	Deore caliper	rear	\N	0	\N
181	95	295	\N	\N	2026-04-27 13:11:32.621+00	2026-04-27 13:11:32.621+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
183	95	295	\N	\N	2026-04-28 05:22:07.635+00	2026-04-28 05:22:07.635+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
185	95	295	\N	\N	2026-04-28 05:43:34.844+00	2026-04-28 05:43:34.844+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
186	95	295	\N	\N	2026-04-28 05:43:37.881+00	2026-04-28 05:43:37.881+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
188	95	295	\N	\N	2026-04-28 05:47:34.847+00	2026-04-28 05:47:34.847+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
190	95	295	\N	\N	2026-04-28 10:55:08.455+00	2026-04-28 10:55:08.455+00	\N	t	f	\N	Shimano XT Chain HG-701	\N	\N	0	\N
\.


--
-- Data for Name: event_action_tags; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.event_action_tags (id, event_action_id, event_action_tag) FROM stdin;
1	2	Full Flush
2	11	Full Damper service
3	11	Full Seal Kit Replacement
4	11	Oil Change (Damper)
5	11	IFP Service & Recharge
6	11	Nitrogen Charge
7	11	Valve/Shim Stack Service
8	11	Air Can Service
9	11	Air Sleeve Seals Replacement
10	11	Lubrication air can
11	11	Hardware Inspection
12	11	Pressure test
13	11	Dust Wiper Replacement
14	8	Oil change lower leg
16	8	Cleaning & Lubrication
15	10	Air Can Service
17	10	Air Sleeve Seals Replacement
18	10	Lubrication air can
19	10	Hardware Inspection
20	10	Pressure test
21	5	Cleaning & Greasing
24	5	Creak Fix
25	5	Shell Facing
23	12	Pressure
26	12	sag
27	12	token settings
22	6	Deep cleaning of all moving parts. Removes all grit, grime, and old grease
28	1	Piston Lube
29	1	Replace Piston
30	1	Replace Seal
31	1	Centering
32	13	Pressure
33	13	sag
34	13	token settings
35	16	New sealant
36	9	Oil change lower leg
37	9	Dust seals replacement
38	9	Cleaning & Lubrication
39	9	Air sleeve service
40	9	Damper seal replacement
41	9	Air seal replacement
42	9	Damper Oil Change
43	9	Test pressure
44	34	No Errors Found
45	34	Error Log Cleared
46	34	Sensor Calibration
48	21	Cleaning and lubricating the headset
49	21	Play Adjustment
47	14	Seřízení ovládací páčky z řidítek
51	32	Deep Charge / geBalancing
52	32	Battery Health Check
50	25	Brass Keys Replacement
53	25	Fresh Slick Honey
54	25	Clean
55	25	New Seal Kit
56	25	Air Pressure Adjustment
58	20	6902-2RS
59	20	6802-2RS
60	20	6803-2RS
61	20	15267-2RS
62	20	6903-2RS
63	20	Enduro Bearings
57	35	Regrease
64	35	Pins Replaced
65	35	New Bearings
66	19	Bearing Regrease
67	19	Freehub Clean & Lube
68	19	Pawl/Ratchet Replacement
69	19	Seal Replacement
70	33	Contacts Cleaned
71	33	Dielectric Grease applied
72	33	Motor Bolts Tightened
73	23	Check the tightness of all screws
74	27	Full Set
75	27	Only rear triangle
76	27	Main Pivot Only
77	27	Enduro bearings
78	38	Oil
79	38	Vax
80	42	Replace upper pulley
81	42	Replace lower pulley
82	42	Pulley wheels Service
83	42	Clutch Service
84	42	Firmware Update
85	42	Battery replacement
86	42	Pivot Lubrication
87	39	H/L/B-Gap Adjustment and shifter cable tension
88	43	Degreasing
\.


--
-- Data for Name: event_action_targets; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.event_action_targets (id, event_action_id, component_type_id) FROM stdin;
2	2	297
3	2	303
15	12	282
22	17	350
23	17	289
24	17	290
35	35	309
43	36	342
46	37	297
47	37	303
1	3	295
4	4	302
10	4	291
8	7	302
12	7	291
11	11	283
7	8	282
9	10	283
5	5	328
6	6	294
13	6	295
14	6	291
16	1	297
17	13	283
18	16	350
19	18	289
20	9	282
21	15	290
25	14	352
26	21	284
27	24	304
28	29	349
29	30	281
30	31	351
31	25	288
32	32	306
33	34	351
34	33	305
36	20	298
37	19	298
38	22	284
39	23	285
40	27	281
41	28	349
42	26	288
44	38	295
45	41	303
48	42	291
49	39	291
50	40	295
51	43	300
\.


--
-- Data for Name: event_actions_done; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.event_actions_done (id, bike_event_id, event_action_id, note, partial_cost, part_replaced, created_at, bike_mileage_at_time, bike_minutes_at_time) FROM stdin;
3	12	4	Brake bleed front	50.00	f	2026-04-28 10:55:08.426+00	\N	\N
4	12	40	Old chain worn out	150.00	t	2026-04-28 10:55:08.461+00	\N	\N
5	13	4	Brake bleed front	50.00	f	2026-04-28 13:28:39.373+00	\N	\N
6	13	40	Old chain worn out	150.00	t	2026-04-28 13:28:39.415+00	\N	\N
\.


--
-- Data for Name: events_action; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.events_action (id, action_name, replace_action, user_id, req_front_suspension, req_rear_suspension, warning_message) FROM stdin;
1	Caliper Service	f	\N	f	f	\N
2	Bleed	f	\N	f	f	\N
3	Wear Check	f	\N	f	f	\N
4	Cable & Housing Replacement	f	\N	f	f	\N
5	BB Service	f	\N	f	f	\N
6	Drivetrain Detox	f	\N	f	f	\N
7	Battery Swap	t	\N	f	f	\N
8	Fork Basic Service	f	\N	f	f	\N
9	Fork Full Service	f	\N	f	f	\N
10	Shock Basic Service	f	\N	f	f	\N
11	Shock Full Service	f	\N	f	f	\N
12	Fork adjusment	f	\N	f	f	\N
13	Shock adjusment	f	\N	f	f	\N
14	Remote Lever Service	f	\N	f	f	\N
15	Tire Replacement	t	\N	f	f	\N
16	Sealant Refresh	t	\N	f	f	\N
17	Tubeless Conversion	f	\N	f	f	\N
18	Wheel Truing	f	\N	f	f	\N
19	Hub Service	f	\N	f	f	\N
20	Hub Bearing Replacement	t	\N	f	f	\N
21	Headset Service	f	\N	f	f	\N
22	Headset Bearing Replacement	t	\N	f	f	\N
23	Bolt Torque Check	f	\N	f	f	\N
24	Grip Replecament	t	\N	f	f	\N
25	Dropper Service	f	\N	f	f	\N
26	Remote Cable Replaced	f	\N	f	f	\N
27	Pivot Bearings Replacement	f	\N	f	f	\N
28	Hanger Replacement	f	\N	f	f	\N
29	Hanger Alignment	f	\N	f	f	\N
30	Apply frame shield	f	\N	f	f	\N
31	Firmware Update	f	\N	f	f	\N
32	Battery Check	f	\N	f	f	\N
33	Hardware Maintenance	f	\N	f	f	\N
34	System Diagnostics	f	\N	f	f	\N
35	Pedal Service	f	\N	f	f	\N
36	Pads Replacement	t	\N	f	f	\N
37	Brake Hose Replacement	t	\N	f	f	\N
38	Chain Lube	f	\N	f	f	\N
41	Lever Replacement	t	\N	f	f	\N
40	Chain Replacement	t	\N	f	f	\N
42	Derailleur Service	f	\N	f	f	\N
39	Derailleur Indexing	f	\N	f	f	\N
43	Rotor Service	f	\N	f	f	\N
\.


--
-- Data for Name: events_bikes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.events_bikes (id, bike_id, note, total_cost, created_at, updated_at, is_deleted, deleted_at) FROM stdin;
8	95	Replaced chain and cleaned drivetrain	350.00	2026-04-28 05:47:34.819+00	\N	f	\N
9	95	Replaced chain and cleaned drivetrain	350.00	2026-04-28 05:48:21.157+00	\N	f	\N
12	95	Replaced chain and cleaned drivetrain	350.00	2026-04-28 10:55:08.416+00	\N	f	\N
13	95	Replaced chain and cleaned drivetrain	350.00	2026-04-28 13:28:39.365+00	\N	f	\N
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.organization_members (id, user_id, role_id, organization_id) FROM stdin;
2	40	1	2
3	38	2	2
4	41	2	2
\.


--
-- Data for Name: organization_roles; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.organization_roles (id, code, name, sort_order, description) FROM stdin;
1	admin	Admin	\N	\N
2	rider	Rider	\N	\N
3	maintainer	Maintainer	\N	\N
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.organizations (id, name, created_at, updated_at, is_deleted, deleted_at) FROM stdin;
2	Orbea Factory	2026-02-02 15:57:25.312358+00	2026-02-02 15:57:25.312358+00	f	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.refresh_tokens (id, user_id, refresh_token, expires_at, created_at, revoked, revoked_at, user_agent, ip_address) FROM stdin;
60	40	fbe7ff40a6d47737dbd0122908cf74f8a2bdab39232e5de1dde7a2fbfb04c708	2026-04-13 09:40:06.496+00	2026-03-30 09:40:06.503+00	f	\N	Chrome on Windows	::1
61	41	290d081a8b1ec5464aeec3b86a71490983576eee51cc5367a5fa97ee243767f7	2026-04-13 11:20:28.647+00	2026-03-30 11:20:28.651+00	f	\N	Unknown on Unknown	::1
62	41	c71fcf2e21d124027e215679cf0a491a436dc1430d7640ba2e240009be75bde3	2026-04-13 11:21:25.516+00	2026-03-30 11:21:25.517+00	f	\N	Unknown on Unknown	::1
63	41	98a15268b377c57bab40b7cb4a6d1027115e39eda71b5ac7e21d417f178b6091	2026-04-13 11:27:30.194+00	2026-03-30 11:27:30.195+00	f	\N	Unknown on Unknown	::1
64	41	adb181d60d5f56f9275bfadb4a44fc3a4961d6203fde979ae718d5122ddd51e9	2026-04-13 11:28:31.01+00	2026-03-30 11:28:31.012+00	f	\N	Unknown on Unknown	::1
65	41	240612e76954440655eb7a3dc3cbacf92b37456448a9d8eaf59d38a779045d97	2026-04-13 11:28:40.101+00	2026-03-30 11:28:40.103+00	f	\N	Unknown on Unknown	::1
66	41	ca413b582df9842ad0d0f611c7fa132c073386b38917d5570467fed165335d21	2026-04-13 11:29:35.266+00	2026-03-30 11:29:35.266+00	f	\N	Unknown on Unknown	::1
67	41	86f0200390dac27f8182f7795b20bfbf3ce99c44ad1676408ddb38630b1befb8	2026-04-13 11:30:21.253+00	2026-03-30 11:30:21.255+00	f	\N	Unknown on Unknown	::1
68	41	74fff4a1440fdcdb1969cc2767b66d105f87944cd3d6c01336ac8b64a2f2bf63	2026-04-13 11:34:10.364+00	2026-03-30 11:34:10.365+00	f	\N	Unknown on Unknown	::1
69	41	69bab12efb950a443be433e2c62c32af1d49ccbe358613589a0457505acf782c	2026-04-13 11:34:16.793+00	2026-03-30 11:34:16.794+00	f	\N	Unknown on Unknown	::1
70	41	35ec71d58668e38e493991e0c6a1a966c6b941234b996ab2e0d3695718f7b68f	2026-04-13 11:34:39.121+00	2026-03-30 11:34:39.123+00	f	\N	Unknown on Unknown	::1
71	41	b444ae3ef590104ee49ffca40adc37b456c08af4d51ba5a056c5e64376714549	2026-04-13 11:34:48.193+00	2026-03-30 11:34:48.194+00	f	\N	Unknown on Unknown	::1
72	41	8acb4c9a06962f0899a8b1b52a03809931c28878794e51cb900d66dff9d32328	2026-04-13 11:35:23.714+00	2026-03-30 11:35:23.715+00	f	\N	Unknown on Unknown	::1
73	41	65f170f568c7520b23a7fa79ce5b674929fadee5578d59892b4b6614a34080a7	2026-04-13 11:35:45.469+00	2026-03-30 11:35:45.47+00	f	\N	Unknown on Unknown	::1
74	41	e000f42c98c8a5046e2d28f2bb1b38a623d61571b97bf10e5e3578e2bcf41734	2026-04-13 11:35:56.337+00	2026-03-30 11:35:56.338+00	f	\N	Unknown on Unknown	::1
75	41	67c0401f2895f904bd4cb1ec5a01aa11da122cb550fb7c381b062fb20d8d6b10	2026-04-13 11:36:02.736+00	2026-03-30 11:36:02.737+00	f	\N	Unknown on Unknown	::1
76	41	19bddad47245204ff60c49b7f75b69b0c2ce52c79db08ab9111e94fc83f4fc25	2026-04-13 11:36:36.138+00	2026-03-30 11:36:36.139+00	f	\N	Unknown on Unknown	::1
77	41	0b4dad28e6daa6818997521dfee612988ea2f9afe7376785caff5ff22701fefa	2026-04-13 11:36:46.222+00	2026-03-30 11:36:46.223+00	f	\N	Unknown on Unknown	::1
78	41	e2d4e5dbd904f549d5353e4b6552706bfc33fb08a6d2afa3f27838d534365eb6	2026-04-13 11:37:16.969+00	2026-03-30 11:37:16.97+00	f	\N	Unknown on Unknown	::1
79	41	c907e8937ee185930fc94acb05cc7c6f87fc2514fa4cebb64ec48b7091099bac	2026-04-13 11:37:27.3+00	2026-03-30 11:37:27.301+00	f	\N	Unknown on Unknown	::1
80	41	c8c4ce34fcaa44362a28ceb26abc408d6b0bcdbd6f1f48d1cab946cfd1ba04ac	2026-04-13 11:37:55.787+00	2026-03-30 11:37:55.788+00	f	\N	Unknown on Unknown	::1
81	41	4af6e06aed362558c2ed19649243c4c1b54265ed9e3398d6e1e0d7cf39ed8f39	2026-04-13 11:39:53.275+00	2026-03-30 11:39:53.275+00	f	\N	Unknown on Unknown	::1
82	41	573847aed72d670700c8726469ef33dda2ff06eb13876eab215bd8535a697efc	2026-04-13 11:41:59.764+00	2026-03-30 11:41:59.765+00	f	\N	Unknown on Unknown	::1
83	41	40a9f809569370d240ece34942a07cbb25b25e0d5dbdcedc1cf9751a1721beb6	2026-04-13 11:43:04.688+00	2026-03-30 11:43:04.689+00	f	\N	Unknown on Unknown	::1
84	41	b1c6a5771360b7552a3bf8b1ab3f3cbfbb8a85d2e18336707c6b4ff2eedc77f0	2026-04-13 11:43:33.586+00	2026-03-30 11:43:33.587+00	f	\N	Unknown on Unknown	::1
85	41	e061b5c7a1218162025b38593f4f896d3cc72798400090f4da78ec8bb385531c	2026-04-13 11:44:23.259+00	2026-03-30 11:44:23.26+00	f	\N	Unknown on Unknown	::1
86	41	bc1c2dc8aa3a0063d61af61beae94b48f85567edcadbbbd2eda329d7ead2210f	2026-04-13 11:46:29.437+00	2026-03-30 11:46:29.438+00	f	\N	Unknown on Unknown	::1
87	41	359237a0ffcd2f8520bf249cd206d1d90a7a37f9a6fb9b538327effe8893767b	2026-04-13 11:46:41.543+00	2026-03-30 11:46:41.545+00	f	\N	Unknown on Unknown	::1
88	41	3c680e044e71fcc4b3bb8d3ffc7696549b23a7f859b0371d43a7425e7e7a177d	2026-04-13 11:46:49.395+00	2026-03-30 11:46:49.395+00	f	\N	Unknown on Unknown	::1
89	41	52c63c48bee46e7ba5f501a55e963ccdb6de6593fd7900231e176e8ceb70e38d	2026-04-13 11:49:44.376+00	2026-03-30 11:49:44.377+00	f	\N	Unknown on Unknown	::1
90	41	8922ecef6e706b85016bc8a06bf9a79b42131e90a9d4905b1f9f637ee75a9078	2026-04-13 11:54:09.417+00	2026-03-30 11:54:09.418+00	f	\N	Unknown on Unknown	::1
91	41	79adafdfc42b117424eaca8bfdb01315dff59ff6647f8b2838d81561795b992e	2026-04-13 11:56:20.93+00	2026-03-30 11:56:20.931+00	f	\N	Unknown on Unknown	::1
92	41	5d91ad07ee8cb9b311a1f9f1327f6aed4e0dff19ed2d46aa876f91cf1a0b7d54	2026-04-13 12:25:35.724+00	2026-03-30 12:25:35.733+00	f	\N	Unknown on Unknown	::1
93	41	4a82bd55c99bee4842d4c6a443b41785d5dc60506245cebe388160694318f9db	2026-04-13 13:08:08.431+00	2026-03-30 13:08:08.435+00	f	\N	Unknown on Unknown	::1
94	41	0b875cb95611043b5864c473f0a190ddc96815caf6291f9e625529de955cf531	2026-04-13 13:08:57.612+00	2026-03-30 13:08:57.618+00	f	\N	Unknown on Unknown	::1
95	41	372aac4fae026bb46cd0a3eea990ec4c4ec27cc6c1fc5a7f3eda1ed7b070e5c2	2026-04-13 13:16:56.004+00	2026-03-30 13:16:56.009+00	f	\N	Unknown on Unknown	::1
96	41	beffb27a4f98d17eb48d27b7a423ab8208478a746548088177b9b213fcaff741	2026-04-13 18:01:23.362+00	2026-03-30 18:01:23.368+00	f	\N	Unknown on Unknown	::1
97	41	28200c65de9ec78811766b637e3a34bd3e3d3a70ca56664e0395928a42cf0b5b	2026-04-14 14:18:19.228+00	2026-03-31 14:18:19.245+00	f	\N	Unknown on Unknown	::1
98	41	1112e074cb5e6ad9a10abb3bdf0bff64367a77726acd2abf919a3d2b9bf98b79	2026-04-14 14:24:57.244+00	2026-03-31 14:24:57.256+00	f	\N	Unknown on Unknown	::1
99	41	1db93953866fc6cbc8f16c507e4b928a501e38d3192685794b8803372426985f	2026-04-14 14:53:07.535+00	2026-03-31 14:53:07.536+00	f	\N	Unknown on Unknown	::1
100	41	9ef213184bb3b4aad762d440033a03e4c2b85b0ee9d05500d2d350a0a3a0b8a7	2026-04-15 06:41:29.902+00	2026-04-01 06:41:29.919+00	f	\N	Unknown on Unknown	::1
101	41	3e788e7bb1adc39e9b809a41fde3cbd46742fe44fdee7eae292be6d33cd80ed2	2026-04-15 10:08:53.942+00	2026-04-01 10:08:53.947+00	f	\N	Unknown on Unknown	::1
102	41	912f9157e7deae6f4928c2ac7fff386c42506df08c6ac27184617f95990ade8e	2026-04-15 10:24:19.764+00	2026-04-01 10:24:19.773+00	f	\N	Unknown on Unknown	::1
103	41	7c267b375bcbf8027bf79284a6d4f7d6291fa60f7d9f200e39e4ab9a0d14a42c	2026-04-15 11:05:35.981+00	2026-04-01 11:05:35.992+00	f	\N	Unknown on Unknown	::1
104	41	c9bc1ad31725050150d02b7620e44a441e70b0d66201dccc0a03ffbff3408b10	2026-04-15 11:29:28.26+00	2026-04-01 11:29:28.269+00	f	\N	Unknown on Unknown	::1
105	41	fdd4acfd635a2a3f1baa65f84ffe3d34525a518545f37629160a0e32fac992c1	2026-04-15 11:46:12.071+00	2026-04-01 11:46:12.09+00	f	\N	Unknown on Unknown	::1
106	41	2b70215c81ce9fea10045b7a493c4dc3a3ad578222e688c410018edb6ca5e3f0	2026-04-16 09:46:49.705+00	2026-04-02 09:46:49.714+00	f	\N	Unknown on Unknown	::1
107	41	4447743faaa6c6fcacbaff1e4ad26fdccd31f0280f5856e639c1ee6a91c0ff83	2026-04-17 10:30:35.943+00	2026-04-03 10:30:35.956+00	f	\N	Unknown on Unknown	::1
108	41	8b349f61b95121e45fe81abedd8017162a93041d885af3400c080a8a48ddcf14	2026-04-18 10:12:13.342+00	2026-04-04 10:12:13.354+00	f	\N	Unknown on Unknown	::1
109	41	25f690c465b083882a6fbe94d0c559a51a7cd719d2d57db2118e85012163e016	2026-04-24 06:22:27.388+00	2026-04-10 06:22:27.396+00	f	\N	Unknown on Unknown	::1
110	41	d8fbd84c9297cb651e35d575ce8e9229261edb734fb2410db27e6ed105b54513	2026-04-24 07:03:36.705+00	2026-04-10 07:03:36.713+00	f	\N	Unknown on Unknown	::1
111	41	9511f13e18743d425ccc1bd67a60c3f89dd49ca5d6c777bc54e36e47731930aa	2026-04-24 07:23:12.782+00	2026-04-10 07:23:12.793+00	f	\N	Unknown on Unknown	::1
112	41	b8e2b63c63ff5c2de1c0f9f686fe2596bda47af6874a2bd6ea2346145af3639c	2026-04-24 07:41:31.14+00	2026-04-10 07:41:31.151+00	f	\N	Unknown on Unknown	::1
113	41	782a5dd4a04588dba319b6dcb79c338490255d3339bdaddd21b119bfd1c43b66	2026-04-24 07:58:52.852+00	2026-04-10 07:58:52.87+00	f	\N	Unknown on Unknown	::1
114	41	fbf416b63e95cb0f16d239e4b89015e2e12d4298b596eea0a2457528f9b77ab3	2026-04-24 08:02:31.046+00	2026-04-10 08:02:31.047+00	f	\N	Unknown on Unknown	::1
115	41	7a3183698e225962bf2281ef9dd3b8e7f397748eca4ad2b2b488da5e848bdb60	2026-04-24 09:56:16.519+00	2026-04-10 09:56:16.521+00	f	\N	Unknown on Unknown	::1
116	41	9696f00418478a5589facf62b428a48b5ee72accfcb7ee5240d0002dbea5a9ad	2026-05-07 13:58:08.628+00	2026-04-23 13:58:08.637+00	f	\N	Unknown on Unknown	::1
117	41	7d8ca23b7a856771c48114d141ed619ba8c17c2870d35df64dba35b8583b84db	2026-05-07 14:00:01.731+00	2026-04-23 14:00:01.74+00	f	\N	Unknown on Unknown	::1
118	40	74a37c7abdac2a0c88819a85acbf44307ddf36ae75bc7ea4f97b2082b65c0f96	2026-05-08 09:54:15.788+00	2026-04-24 09:54:15.802+00	f	\N	Chrome on Windows	::1
119	42	487eaf0beb687572dda46e1278e41dc2c50efec2902bbcc23e40cb54ecffe425	2026-05-11 12:26:28.187+00	2026-04-27 12:26:28.19+00	f	\N	Unknown on Unknown	::1
120	42	820b9fb950e2c7855a779904aa6527ba2fdee7f28dcf4ffac2d34c2fd97fc3eb	2026-05-11 12:30:25.57+00	2026-04-27 12:30:25.577+00	f	\N	Unknown on Unknown	::1
121	42	b11ed214f562e6037955b4c20354f020ae2ee5ab161b3438f809dacb4661cec2	2026-05-11 12:36:14.941+00	2026-04-27 12:36:14.944+00	f	\N	Unknown on Unknown	::1
122	42	174256c380e41b2cc9f287c6fd9c4c40525fb1d2467cc31b9d0b1994926f9f4f	2026-05-11 12:36:46.793+00	2026-04-27 12:36:46.795+00	f	\N	Unknown on Unknown	::1
123	42	5bb6dcf9e84e77b0077fb2d5834fffcf4f2e5b93ae5bb4ce8de78bad9e5dd9e0	2026-05-11 12:36:48.098+00	2026-04-27 12:36:48.1+00	f	\N	Unknown on Unknown	::1
124	42	e14c8993cae492d0f2e2f91993334494566a58142bd099c51835028765fb85c5	2026-05-11 12:37:46.018+00	2026-04-27 12:37:46.02+00	f	\N	Unknown on Unknown	::1
125	42	894aa393161319936442e5f5b40f61b076cdff8e643585e33894f9a659fbfdee	2026-05-11 12:38:58.748+00	2026-04-27 12:38:58.749+00	f	\N	Unknown on Unknown	::1
126	42	d198def74b278cd8703ab3bd4a807356d0fab3585ea998bf28ace64ab8546ef4	2026-05-11 12:39:04.951+00	2026-04-27 12:39:04.952+00	f	\N	Unknown on Unknown	::1
127	42	aa1d5b9303c7245e6f79030b6ab8bf7d277a7c3e427504f0d43c16565c4f9269	2026-05-11 12:43:59.101+00	2026-04-27 12:43:59.102+00	f	\N	Unknown on Unknown	::1
128	42	89367f7f289eb6af17397b116a41be3fe1000da30dcf3cae24ed3ce6f564659a	2026-05-11 12:44:04.066+00	2026-04-27 12:44:04.067+00	f	\N	Unknown on Unknown	::1
129	42	5d7b5b480204189c261f1a563ef7dcfd6fe118c2343b6a36feaeb1533740c617	2026-05-11 12:44:18.592+00	2026-04-27 12:44:18.592+00	f	\N	Unknown on Unknown	::1
130	42	761189ad826f4e2554fa97b546af3e4dcb3b47b3e96bbb307885c41842507b76	2026-05-11 12:44:34.615+00	2026-04-27 12:44:34.616+00	f	\N	Unknown on Unknown	::1
131	42	5d443e14cb5edc9dab567a8f56916531cafd5fd07aaa84a340fee1b3d9f6be1b	2026-05-11 12:44:54.664+00	2026-04-27 12:44:54.665+00	f	\N	Unknown on Unknown	::1
132	42	0948f5ad295156aa89c8f5a0d28a337bf25c6501829778f6b26839e085da8534	2026-05-11 12:44:58.759+00	2026-04-27 12:44:58.759+00	f	\N	Unknown on Unknown	::1
133	42	38a04d716ec5c8815e2e189f9fc698d43302cbef4eaa2d5cd49403064f57f617	2026-05-11 13:00:15.086+00	2026-04-27 13:00:15.094+00	f	\N	Unknown on Unknown	::1
134	42	f83ceca82b3db1d750b2f9d94c287b9a2018fbb05d54b54fac61479db0a97602	2026-05-11 13:08:38.799+00	2026-04-27 13:08:38.806+00	f	\N	Unknown on Unknown	::1
135	42	5b6d42e16cfe5c02282bcc7969d0a8d9ecded850e45c6e95cdd9396f237a3184	2026-05-12 05:19:29.515+00	2026-04-28 05:19:29.523+00	f	\N	Unknown on Unknown	::1
136	42	b23a6916230288b99858ef062e87bc0c2da2fbfb6b2f7dca26919d33f9103128	2026-05-12 05:41:03.382+00	2026-04-28 05:41:03.383+00	f	\N	Unknown on Unknown	::1
137	42	c176d80e7d82d7cdeb04a15d40680adef5f8be82ac682de1e5a9dd0959a6e3d6	2026-05-12 05:46:13.116+00	2026-04-28 05:46:13.129+00	f	\N	Unknown on Unknown	::1
138	42	fcf364e46768471f1f55ba55e6511c0a78a46e75491cb5b4b5d14e891e6e8d10	2026-05-12 10:55:01.136+00	2026-04-28 10:55:01.144+00	f	\N	Unknown on Unknown	::1
139	42	b87f040c029dcb0c462398ff0a1f053c04184652608411e42b4cf812890af90a	2026-05-12 13:28:31.593+00	2026-04-28 13:28:31.603+00	f	\N	Unknown on Unknown	::1
140	42	7594eabf8f8f0d1d27b5429de209c7b711e5cd2a9664de544a60164a96523c2d	2026-05-12 13:29:51.488+00	2026-04-28 13:29:51.489+00	f	\N	Unknown on Unknown	::1
\.


--
-- Data for Name: ride_styles; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.ride_styles (id, ride_style) FROM stdin;
41	Cross Country
42	Trail Riding
43	Downhill
44	Enduro
\.


--
-- Data for Name: rides; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.rides (id, bike_id, user_id, started_at, duration_sec, distance_m, elevation_down_m, elevation_up_m, speed_down, speed_avg, braking_load_score, max_speed_kmh, is_deleted, deleted_at) FROM stdin;
\.


--
-- Data for Name: suspension_setup; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.suspension_setup (id, mounted_component_id, setup_date, pressure_psi, pressure_bar, sag_percentage, amount_tokens_spacers, rebound_ls, rebound_hs, compression_ls, compression_hs, notes) FROM stdin;
\.


--
-- Data for Name: tire_setup; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.tire_setup (id, component_mounted_id, tire_pressure_bar, tire_pressure_psi) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.users (id, name, email, password_hash, avatar_url, language, is_active, created_at, updated_at, last_login_at, currency, weight_kg, is_deleted, deleted_at, "googleId") FROM stdin;
40	Jaroslav	jardalufi@gmail.com	\N	\N	en	t	2026-03-30 09:40:06.45+00	2026-03-30 09:40:06.45+00	\N	\N	\N	f	\N	116856027026290023551
38	Petr	test@test.com	testing123456		en	t	2026-03-23 14:03:28.862+00	2026-03-23 14:03:28.862+00	\N	\N	\N	f	\N	
41	Josef	j@gj.com	$2b$10$lg/cIqoQnHY.N67fNsSNTe8bBXEtNIAtZNui8ybt94EttQJaNels2	\N	en	t	2026-03-30 11:19:27.84+00	2026-03-30 11:19:27.84+00	\N	\N	\N	f	\N	\N
42	John Doe	jarda@jarda.com	$2b$10$Lr9sqtfOqEtb0MSZCzDPZ.mG.MXGLn376vDQrGvIsLeaxKPE3bEaW	\N	en	t	2026-04-27 12:26:09.104+00	2026-04-27 12:26:09.104+00	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: wheel_sizes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.wheel_sizes (id, size) FROM stdin;
13	26"
14	27.5"
15	29"
16	mullet
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.accounts_id_seq', 1, false);


--
-- Name: action_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.action_types_id_seq', 50, true);


--
-- Name: bike_brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_brands_id_seq', 11990, true);


--
-- Name: bike_components_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_components_id_seq', 191, true);


--
-- Name: bike_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_details_id_seq', 1, false);


--
-- Name: bike_event_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_event_attachments_id_seq', 1, true);


--
-- Name: bike_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_events_id_seq', 13, true);


--
-- Name: bike_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_models_id_seq', 2156, true);


--
-- Name: bike_sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_sizes_id_seq', 58, true);


--
-- Name: bike_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_types_id_seq', 61, true);


--
-- Name: bikes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bikes_id_seq', 141, true);


--
-- Name: component_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.component_groups_id_seq', 15, true);


--
-- Name: component_service_intervals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.component_service_intervals_id_seq', 1, false);


--
-- Name: component_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.component_types_id_seq', 352, true);


--
-- Name: event_action_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.event_action_tags_id_seq', 88, true);


--
-- Name: event_action_targets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.event_action_targets_id_seq', 51, true);


--
-- Name: event_actions_done_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.event_actions_done_id_seq', 6, true);


--
-- Name: organization_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.organization_members_id_seq', 4, true);


--
-- Name: organization_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.organization_roles_id_seq', 3, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.organizations_id_seq', 2, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 140, true);


--
-- Name: ride_styles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.ride_styles_id_seq', 50, true);


--
-- Name: rides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.rides_id_seq', 1, false);


--
-- Name: suspension_setup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.suspension_setup_id_seq', 1, false);


--
-- Name: tire_setup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.tire_setup_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.users_id_seq', 42, true);


--
-- Name: wheel_sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.wheel_sizes_id_seq', 16, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: action_done_component_map action_done_component_map_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.action_done_component_map
    ADD CONSTRAINT action_done_component_map_pkey PRIMARY KEY (event_action_done_id, component_mounted_id);


--
-- Name: events_action action_types_action_name_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_action
    ADD CONSTRAINT action_types_action_name_key UNIQUE (action_name);


--
-- Name: events_action action_types_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_action
    ADD CONSTRAINT action_types_pkey PRIMARY KEY (id);


--
-- Name: bike_brands bike_brand_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_brands
    ADD CONSTRAINT bike_brand_pkey PRIMARY KEY (id);


--
-- Name: bike_brands bike_brands_bike_brand_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_brands
    ADD CONSTRAINT bike_brands_bike_brand_key UNIQUE (bike_brand);


--
-- Name: components_mounted bike_components_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.components_mounted
    ADD CONSTRAINT bike_components_pkey PRIMARY KEY (id);


--
-- Name: bike_event_attachments bike_event_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_event_attachments
    ADD CONSTRAINT bike_event_attachments_pkey PRIMARY KEY (id);


--
-- Name: events_bikes bike_events_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_bikes
    ADD CONSTRAINT bike_events_pkey PRIMARY KEY (id);


--
-- Name: bike_models bike_models_model_name_brand_id_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_models
    ADD CONSTRAINT bike_models_model_name_brand_id_key UNIQUE (model_name) INCLUDE (brand_id);


--
-- Name: bike_models bike_models_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_models
    ADD CONSTRAINT bike_models_pkey PRIMARY KEY (id);


--
-- Name: bike_sizes bike_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_sizes
    ADD CONSTRAINT bike_sizes_pkey PRIMARY KEY (id);


--
-- Name: bike_sizes bike_sizes_size_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_sizes
    ADD CONSTRAINT bike_sizes_size_key UNIQUE (size);


--
-- Name: bike_types bike_types_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_types
    ADD CONSTRAINT bike_types_pkey PRIMARY KEY (id);


--
-- Name: bike_types bike_types_type_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_types
    ADD CONSTRAINT bike_types_type_key UNIQUE (type);


--
-- Name: bikes bikes_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_pkey PRIMARY KEY (id);


--
-- Name: organization_roles code; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_roles
    ADD CONSTRAINT code UNIQUE (code);


--
-- Name: component_groups component_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.component_groups
    ADD CONSTRAINT component_groups_pkey PRIMARY KEY (id);


--
-- Name: action_service_intervals component_service_intervals_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.action_service_intervals
    ADD CONSTRAINT component_service_intervals_pkey PRIMARY KEY (id);


--
-- Name: component_types component_types_component_type_user_id_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.component_types
    ADD CONSTRAINT component_types_component_type_user_id_key UNIQUE (component_type, user_id);


--
-- Name: component_types component_types_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.component_types
    ADD CONSTRAINT component_types_pkey PRIMARY KEY (id);


--
-- Name: event_action_tags event_action_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_action_tags
    ADD CONSTRAINT event_action_tags_pkey PRIMARY KEY (id);


--
-- Name: event_action_targets event_action_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_action_targets
    ADD CONSTRAINT event_action_targets_pkey PRIMARY KEY (id);


--
-- Name: event_actions_done event_actions_done_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_actions_done
    ADD CONSTRAINT event_actions_done_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens jwt_token; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT jwt_token UNIQUE (refresh_token);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organization_roles organization_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_roles
    ADD CONSTRAINT organization_roles_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: ride_styles ride_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.ride_styles
    ADD CONSTRAINT ride_styles_pkey PRIMARY KEY (id);


--
-- Name: ride_styles ride_styles_ride_style_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.ride_styles
    ADD CONSTRAINT ride_styles_ride_style_key UNIQUE (ride_style);


--
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);


--
-- Name: suspension_setup suspension_setup_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.suspension_setup
    ADD CONSTRAINT suspension_setup_pkey PRIMARY KEY (id);


--
-- Name: tire_setup tire_setup_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.tire_setup
    ADD CONSTRAINT tire_setup_pkey PRIMARY KEY (id);


--
-- Name: organization_members unique_organization_members; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT unique_organization_members UNIQUE (organization_id, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wheel_sizes wheel_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.wheel_sizes
    ADD CONSTRAINT wheel_sizes_pkey PRIMARY KEY (id);


--
-- Name: wheel_sizes wheel_sizes_size_key; Type: CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.wheel_sizes
    ADD CONSTRAINT wheel_sizes_size_key UNIQUE (size);


--
-- Name: action_done_component_map_component_mounted_id_idx; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX action_done_component_map_component_mounted_id_idx ON public.action_done_component_map USING btree (component_mounted_id);


--
-- Name: bike_components_bike_id; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_bike_id ON public.components_mounted USING btree (bike_id);


--
-- Name: bike_components_component_id; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_component_id ON public.components_mounted USING btree (component_type_id);


--
-- Name: bike_components_is_active; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_is_active ON public.components_mounted USING btree (is_active);


--
-- Name: bike_components_mileage; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_mileage ON public.components_mounted USING btree (total_km);


--
-- Name: bike_components_mounted_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_mounted_at ON public.components_mounted USING btree (mounted_at);


--
-- Name: bike_components_remove_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_remove_at ON public.components_mounted USING btree (removed_at);


--
-- Name: bike_components_updated_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_components_updated_at ON public.components_mounted USING btree (updated_at);


--
-- Name: bike_events_bike_id; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_events_bike_id ON public.events_bikes USING btree (bike_id);


--
-- Name: bike_events_created_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_events_created_at ON public.events_bikes USING btree (created_at);


--
-- Name: bike_events_updated_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bike_events_updated_at ON public.events_bikes USING btree (updated_at);


--
-- Name: bikes_bike_size_col; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bikes_bike_size_col ON public.bikes USING btree (bike_size_id);


--
-- Name: bikes_created_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bikes_created_at ON public.bikes USING btree (created_at);


--
-- Name: bikes_type_id; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bikes_type_id ON public.bikes USING btree (bike_type_id);


--
-- Name: bikes_updated_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bikes_updated_at ON public.bikes USING btree (updated_at);


--
-- Name: bikes_wheel_size_id; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX bikes_wheel_size_id ON public.bikes USING btree (wheel_size_id);


--
-- Name: components_mounted_desc_trgm_idx; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX components_mounted_desc_trgm_idx ON public.components_mounted USING gin (component_desc public.gin_trgm_ops);


--
-- Name: event_actions_done_bike_event_id_idx; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX event_actions_done_bike_event_id_idx ON public.event_actions_done USING btree (bike_event_id);


--
-- Name: event_actions_done_event_action_id_idx; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX event_actions_done_event_action_id_idx ON public.event_actions_done USING btree (event_action_id);


--
-- Name: index_1; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE UNIQUE INDEX index_1 ON public.organization_members USING btree (organization_id, user_id);


--
-- Name: rides_bike_id; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX rides_bike_id ON public.rides USING btree (bike_id);


--
-- Name: rides_started_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX rides_started_at ON public.rides USING btree (started_at);


--
-- Name: users_created_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX users_created_at ON public.users USING btree (created_at);


--
-- Name: users_googleId_key; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE UNIQUE INDEX "users_googleId_key" ON public.users USING btree ("googleId");


--
-- Name: users_last_login_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX users_last_login_at ON public.users USING btree (last_login_at);


--
-- Name: users_name; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX users_name ON public.users USING btree (name);


--
-- Name: users_updated_at; Type: INDEX; Schema: public; Owner: jaroslav_user
--

CREATE INDEX users_updated_at ON public.users USING btree (updated_at);


--
-- Name: action_done_component_map action_done_component_map_component_mounted_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.action_done_component_map
    ADD CONSTRAINT action_done_component_map_component_mounted_id_fkey FOREIGN KEY (component_mounted_id) REFERENCES public.components_mounted(id);


--
-- Name: action_done_component_map action_done_component_map_event_action_done_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.action_done_component_map
    ADD CONSTRAINT action_done_component_map_event_action_done_id_fkey FOREIGN KEY (event_action_done_id) REFERENCES public.event_actions_done(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: action_service_intervals action_service_intervals_event_actions_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.action_service_intervals
    ADD CONSTRAINT action_service_intervals_event_actions_id_fkey FOREIGN KEY (event_actions_id) REFERENCES public.events_action(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: bike_models bike_brands_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_models
    ADD CONSTRAINT bike_brands_fkey FOREIGN KEY (brand_id) REFERENCES public.bike_brands(id) ON DELETE CASCADE NOT VALID;


--
-- Name: bike_event_attachments bike_event_attachments_bike_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bike_event_attachments
    ADD CONSTRAINT bike_event_attachments_bike_event_id_fkey FOREIGN KEY (bike_event_id) REFERENCES public.events_bikes(id) ON DELETE CASCADE;


--
-- Name: events_bikes bike_events_bike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_bikes
    ADD CONSTRAINT bike_events_bike_id_fkey FOREIGN KEY (bike_id) REFERENCES public.bikes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bikes bikes_bike_size_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_bike_size_id_fkey FOREIGN KEY (bike_size_id) REFERENCES public.bike_sizes(id);


--
-- Name: bikes bikes_bike_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_bike_type_id_fkey FOREIGN KEY (bike_type_id) REFERENCES public.bike_types(id);


--
-- Name: bikes bikes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) NOT VALID;


--
-- Name: bikes bikes_ride_style_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_ride_style_fkey FOREIGN KEY (ride_style_id) REFERENCES public.ride_styles(id) NOT VALID;


--
-- Name: bikes bikes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) NOT VALID;


--
-- Name: bikes bikes_wheel_size_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.bikes
    ADD CONSTRAINT bikes_wheel_size_id_fkey FOREIGN KEY (wheel_size_id) REFERENCES public.wheel_sizes(id);


--
-- Name: component_types component_types_component_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.component_types
    ADD CONSTRAINT component_types_component_group_id_fkey FOREIGN KEY (component_group_id) REFERENCES public.component_groups(id) NOT VALID;


--
-- Name: component_types component_types_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.component_types
    ADD CONSTRAINT component_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: components_mounted components_mounted_bike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.components_mounted
    ADD CONSTRAINT components_mounted_bike_id_fkey FOREIGN KEY (bike_id) REFERENCES public.bikes(id) ON DELETE CASCADE NOT VALID;


--
-- Name: components_mounted components_mounted_component_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.components_mounted
    ADD CONSTRAINT components_mounted_component_type_id_fkey FOREIGN KEY (component_type_id) REFERENCES public.component_types(id) ON DELETE RESTRICT NOT VALID;


--
-- Name: event_action_tags event_action_tags_event_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_action_tags
    ADD CONSTRAINT event_action_tags_event_action_id_fkey FOREIGN KEY (event_action_id) REFERENCES public.events_action(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: event_action_targets event_action_targets_component_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_action_targets
    ADD CONSTRAINT event_action_targets_component_type_id_fkey FOREIGN KEY (component_type_id) REFERENCES public.component_types(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: event_action_targets event_action_targets_event_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_action_targets
    ADD CONSTRAINT event_action_targets_event_action_id_fkey FOREIGN KEY (event_action_id) REFERENCES public.events_action(id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: event_actions_done event_actions_done_bike_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_actions_done
    ADD CONSTRAINT event_actions_done_bike_event_id_fkey FOREIGN KEY (bike_event_id) REFERENCES public.events_bikes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: event_actions_done event_actions_done_event_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.event_actions_done
    ADD CONSTRAINT event_actions_done_event_action_id_fkey FOREIGN KEY (event_action_id) REFERENCES public.events_action(id);


--
-- Name: events_action events_action_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.events_action
    ADD CONSTRAINT events_action_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: organization_members organization_members_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.organization_roles(id) NOT VALID;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;


--
-- Name: rides rides_bike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_bike_id_fkey FOREIGN KEY (bike_id) REFERENCES public.bikes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rides rides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;


--
-- Name: suspension_setup suspension_setup_mounted_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.suspension_setup
    ADD CONSTRAINT suspension_setup_mounted_component_id_fkey FOREIGN KEY (mounted_component_id) REFERENCES public.components_mounted(id);


--
-- Name: tire_setup tire_setup_component_mounted_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.tire_setup
    ADD CONSTRAINT tire_setup_component_mounted_id_fkey FOREIGN KEY (component_mounted_id) REFERENCES public.components_mounted(id);


--
-- Name: refresh_tokens user_id; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: accounts userid_accountid; Type: FK CONSTRAINT; Schema: public; Owner: jaroslav_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT userid_accountid FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rg68GWEh5RuzgqJF9Sd2nSo6eP033963h9WyhDXEA6Ag7dGNcWZBx4ebTcaaLGo

