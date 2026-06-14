import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations("metadata.privacy");

    return buildLocalizedMetadata({
        locale,
        href: "/privacy",
        title: t("title"),
        description: t("description"),
    });
}

const bodySx = {
    color: tokens.textSecondary,
    lineHeight: 1.75,
    mb: 2,
} as const;

const h5Sx = {
    color: tokens.textPrimary,
    fontWeight: 700,
    mt: 1,
} as const;

const listSx = {
    pl: 2.5,
    mb: 2,
    color: tokens.textSecondary,
    lineHeight: 1.75,
    "& li": { mb: 1 },
} as const;

export default function PrivacyPage() {
    return (
        <Box sx={{ bgcolor: tokens.bg, minHeight: "60vh", py: { xs: 3, md: 5 } }}>
            <PageContainer>
                <Stack spacing={1} sx={{ maxWidth: 720 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        fontWeight={800}
                        letterSpacing="-0.02em"
                        sx={{ color: tokens.textPrimary, mb: 1 }}
                    >
                        Политика обработки персональных данных
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.textMuted, mb: 2 }}>
                        Сервис «East West Delivery» · редакция от 2 июня 2026 г.
                    </Typography>

                    <Typography variant="h5" component="h2" sx={h5Sx}>
                        1. Общие положения
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        1.1. Настоящая Политика определяет порядок обработки и защиты
                        персональных данных пользователей сайта и мобильной версии сервиса
                        East West Delivery (далее - «Сервис», «Оператор»).
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        1.2. Оператором персональных данных является ресторан East West,
                        осуществляющий деятельность по приёму и исполнению заказов на доставку
                        готовой еды (г. Ереван, ул. Чаренца, 19).
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        1.3. Политика разработана с учётом требований Закона Республики Армения
                        «О защите персональных данных», а также общепризнанных принципов
                        обработки данных (законность, ограничение цели, минимизация объёма,
                        конфиденциальность), сопоставимых с положениями Федерального закона РФ
                        № 152-ФЗ «О персональных данных» и актами о защите данных в странах СНГ.
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        1.4. Используя Сервис и оформляя заказ, вы подтверждаете, что ознакомились
                        с Политикой. При несогласии с условиями обработки данных воздержитесь от
                        использования Сервиса.
                    </Typography>

                    <Typography variant="h5" component="h2" sx={h5Sx}>
                        2. Какие данные мы собираем
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        Оператор обрабатывает только данные, необходимые для работы Сервиса:
                    </Typography>
                    <Box component="ul" sx={listSx}>
                        <Typography component="li" variant="body1">
                            <strong>Имя</strong> - для обращения при исполнении заказа;
                        </Typography>
                        <Typography component="li" variant="body1">
                            <strong>Номер телефона</strong> - для подтверждения заказа и связи с
                            курьером;
                        </Typography>
                        <Typography component="li" variant="body1">
                            <strong>Адрес электронной почты</strong> - для входа в личный кабинет
                            (email и пароль);
                        </Typography>
                        <Typography component="li" variant="body1">
                            <strong>Адрес доставки</strong> - при выборе доставки (улица, дом,
                            подъезд, этаж, комментарий к адресу);
                        </Typography>
                        <Typography component="li" variant="body1">
                            данные о заказах (состав, сумма, статус, способ оплаты и доставки);
                        </Typography>
                        <Typography component="li" variant="body1">
                            технические данные: IP-адрес, тип браузера, файлы cookie и
                            localStorage (корзина, черновик оформления) - в объёме, необходимом
                            для функционирования Сайта.
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={bodySx}>
                        Оператор не запрашивает специальные категории персональных данных
                        (состояние здоровья, биометрия и т. п.), за исключением сведений,
                        которые вы добровольно указываете в комментарии к заказу (например,
                        аллергия на продукт).
                    </Typography>

                    <Typography variant="h5" component="h2" sx={h5Sx}>
                        3. Цели сбора данных
                    </Typography>
                    <Box component="ol" sx={listSx}>
                        <Typography component="li" variant="body1">
                            заключение и исполнение договора купли-продажи и доставки (оформление
                            и выполнение заказа);
                        </Typography>
                        <Typography component="li" variant="body1">
                            связь с клиентом (звонок, SMS, уведомления о статусе заказа);
                        </Typography>
                        <Typography component="li" variant="body1">
                            организация доставки и самовывоза;
                        </Typography>
                        <Typography component="li" variant="body1">
                            ведение истории заказов в личном кабинете;
                        </Typography>
                        <Typography component="li" variant="body1">
                            улучшение качества Сервиса, учёт обращений и претензий;
                        </Typography>
                        <Typography component="li" variant="body1">
                            соблюдение требований законодательства (бухгалтерский и налоговый
                            учёт - в обезличенном или минимально необходимом объёме).
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={bodySx}>
                        Обработка осуществляется на основании согласия субъекта данных, исполнения
                        договора и законного интереса Оператора при соблюдении прав субъекта.
                    </Typography>

                    <Typography variant="h5" component="h2" sx={h5Sx}>
                        4. Передача данных третьим лицам
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        4.1. Оператор не продаёт и не сдаёт в аренду персональные данные.
                        Передача допускается только в случаях, необходимых для исполнения заказа:
                    </Typography>
                    <Box component="ul" sx={listSx}>
                        <Typography component="li" variant="body1">
                            курьерам и сотрудникам доставки - имя, телефон, адрес и сумма к
                            оплате для передачи заказа;
                        </Typography>
                        <Typography component="li" variant="body1">
                            платёжным и техническим партнёрам - в объёме, требуемом для оказания
                            услуг (хостинг, почтовый сервис), при наличии договоров о
                            конфиденциальности;
                        </Typography>
                        <Typography component="li" variant="body1">
                            государственным органам - по законному запросу в пределах,
                            установленных законом.
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={bodySx}>
                        4.2. Трансграничная передача данных (на серверы за пределами Республики
                        Армения) может осуществляться при использовании облачной инфраструктуры;
                        Оператор обеспечивает наличие надлежащих гарантий защиты в соответствии с
                        применимым правом.
                    </Typography>

                    <Typography variant="h5" component="h2" sx={h5Sx}>
                        5. Хранение данных и защита
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        5.1. Данные хранятся в течение срока, необходимого для целей обработки:
                        данные учётной записи и история заказов - до удаления аккаунта или
                        отзыва согласия, но не менее срока, установленного для бухгалтерского учёта
                        (как правило, 3 года с даты последней операции), если иное не требуется
                        законом.
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        5.2. Оператор применяет организационные и технические меры: ограничение
                        доступа сотрудников, HTTPS, хранение паролей административной панели в
                        защищённом виде, резервное копирование. Полная безопасность передачи
                        данных в сети Интернет не может быть гарантирована; вы используете Сервис
                        на свой риск в пределах разумных мер Оператора.
                    </Typography>

                    <Typography variant="h5" component="h2" sx={h5Sx}>
                        6. Права пользователя
                    </Typography>
                    <Typography variant="body1" sx={bodySx}>
                        Вы вправе:
                    </Typography>
                    <Box component="ul" sx={listSx}>
                        <Typography component="li" variant="body1">
                            получать информацию об обработке ваших персональных данных;
                        </Typography>
                        <Typography component="li" variant="body1">
                            требовать уточнения, блокирования или уничтожения данных, если они
                            неполны, устарели или обработаны незаконно;
                        </Typography>
                        <Typography component="li" variant="body1">
                            отозвать согласие на обработку (в том числе запросить удаление
                            учётной записи), направив обращение Оператору - при этом исполнение
                            текущих заказов может быть ограничено;
                        </Typography>
                        <Typography component="li" variant="body1">
                            возражать против обработки в маркетинговых целях (рассылки
                            осуществляются только при отдельном согласии, если таковое
                            запрашивается);
                        </Typography>
                        <Typography component="li" variant="body1">
                            обжаловать действия Оператора в уполномоченный орган по защите
                            персональных данных Республики Армения или в суд.
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={bodySx}>
                        Для реализации прав направьте запрос через контакты, указанные на Сайте,
                        с указанием имени и телефона, привязанных к заказам. Оператор ответит в
                        срок до 30 календарных дней, если иной срок не установлен законом.
                    </Typography>
                    <Typography variant="body1" sx={{ ...bodySx, mb: 0 }}>
                        Актуальная версия Политики всегда доступна по адресу{" "}
                        <Box component="a" href="/privacy" sx={{ color: "primary.main" }}>
                            /privacy
                        </Box>
                        . Оформляя заказ на Сайте, вы также принимаете условия{" "}
                        <Box component="a" href="/offer" sx={{ color: "primary.main" }}>
                            публичной оферты
                        </Box>
                        .
                    </Typography>
                </Stack>
            </PageContainer>
        </Box>
    );
}
